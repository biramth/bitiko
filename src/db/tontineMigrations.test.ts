import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

/** Migration 0156 (tontine commerciale) sur un vrai Postgres (PGlite) : droits, plafonds, versements immuables, remise. */

const MIGRATIONS = path.resolve(import.meta.dirname, '../../supabase/migrations')
const read = (name: string) => readFileSync(path.join(MIGRATIONS, name), 'utf8')

const SHOP = '00000000-0000-0000-0000-0000000000a1'
const OTHER_SHOP = '00000000-0000-0000-0000-0000000000a2'
const OWNER = '00000000-0000-0000-0000-0000000000b1'
const OTHER_OWNER = '00000000-0000-0000-0000-0000000000b2'
const MANAGER = '00000000-0000-0000-0000-0000000000c1'
const VENDEUR = '00000000-0000-0000-0000-0000000000c2'

let db: PGlite
const rows = async <T = Record<string, unknown>>(sql: string) => (await db.query<T>(sql)).rows
const one = async <T = Record<string, unknown>>(sql: string) => (await rows<T>(sql))[0]
const as = (uid: string) => db.exec(`reset role; select set_config('app.uid', '${uid}', false); set role authenticated;`)
const asAdmin = () => db.exec(`reset role; select set_config('app.uid', '', false);`)

const createTontine = async (name: string, shop = SHOP) =>
  (await one<{ id: string }>(
    `insert into tontines(shop_id, name, installment_amount, frequency, start_date, end_date)
     values ('${shop}', '${name}', 5000, 'weekly', '2026-10-01', '2027-05-20') returning id`,
  )).id
const addMember = async (tontineId: string, name: string, phone = 'null') =>
  (await one<{ id: string }>(
    `insert into tontine_members(tontine_id, shop_id, name, phone, target_amount) values ('${tontineId}', '${SHOP}', '${name}', ${phone}, 150000) returning id`,
  )).id
// Boutique et tontine sont déduites du membre par le trigger.
const pay = (memberId: string, amount: number) =>
  db.exec(`insert into tontine_contributions(member_id, amount, paid_on) values ('${memberId}', ${amount}, '2026-10-08')`)

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create schema auth;
    grant usage on schema auth to authenticated;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true),'')::uuid $$;
    create table public.countries(code text primary key, dial_code text not null, trunk_prefix text not null default '0', national_number_length integer not null, national_regex text not null);
    insert into public.countries values ('SN', '+221', '0', 9, '^[37][0-9]{8}$');
    create table public.shops(id uuid primary key, owner_id uuid not null, country_code text not null default 'SN' references public.countries(code));
    create table public.shop_members(shop_id uuid, user_id uuid, role text);
    create function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
    create table public.plans(key text primary key);
    create table public.plan_limits(plan_key text not null references public.plans(key), code text not null, max_value integer, primary key (plan_key, code));
    insert into public.plans values ('free'),('essential'),('pro');
    create table public.shop_subscriptions(shop_id uuid primary key references public.shops(id) on delete cascade, plan text not null, status text not null default 'active', current_period_end timestamptz);
    insert into public.shops(id, owner_id) values ('${SHOP}', '${OWNER}'), ('${OTHER_SHOP}', '${OTHER_OWNER}');
    insert into public.shop_members values ('${SHOP}', '${MANAGER}', 'manager'), ('${SHOP}', '${VENDEUR}', 'vendeur');
  `)
  await db.exec(read('0027_enforce_plan_limits_server_side.sql').match(/create or replace function public\.effective_plan_key[\s\S]*?\$\$;/)![0])
  await db.exec(read('0093_shop_members.sql').match(/create or replace function public\.shop_role[\s\S]*?\$\$;/)![0])
  await db.exec(read('0125_plan_limits_services.sql').match(/create or replace function public\.plan_limit\(p_plan[\s\S]*?\$\$;/)![0])
  await db.exec(read('0128_countries_and_generic_phones.sql').match(/create or replace function public\.normalize_phone[\s\S]*?\n\$\$;/)![0])
  await db.exec(read('0130_finance_tools.sql').split('-- ── Recettes automatiques')[0])
  await db.exec(read('0156_tontines.sql'))
  // Re-exécutable.
  await db.exec(read('0156_tontines.sql'))
}, 60_000)

describe('tontine commerciale (0156)', () => {
  it('déduit la boutique, normalise le téléphone et refuse les champs de remise à la création', async () => {
    await as(OWNER)
    const tontineId = await createTontine('Tabaski 2027')
    const member = await one<{ shop_id: string; phone: string; status: string }>(
      `insert into tontine_members(tontine_id, shop_id, name, phone, target_amount, status, settled_amount, settlement_kind, settled_on)
       values ('${tontineId}', '${OTHER_SHOP}', 'Awa', '77 123 45 67', 150000, 'settled', 999, 'cash', '2026-10-01')
       returning shop_id, phone, status`,
    )
    expect(member).toEqual({ shop_id: SHOP, phone: '+221771234567', status: 'active' })
    await expect(db.exec(`insert into tontine_members(tontine_id, shop_id, name, phone, target_amount) values ('${tontineId}', '${SHOP}', 'X', '12', 1000)`)).rejects.toThrow(/invalid phone/)
    await asAdmin()
    await db.exec('delete from tontine_members; delete from tontines')
  })

  it('applique le plafond de tontines en cours selon le plan', async () => {
    await as(OWNER)
    await createTontine('Première')
    await expect(createTontine('Deuxième')).rejects.toThrow(/plan_limit_exceeded/)
    await asAdmin()
    await db.exec(`insert into shop_subscriptions values ('${SHOP}', 'pro', 'active', now() + interval '30 days')`)
    await as(OWNER)
    await createTontine('Deuxième')
    await asAdmin()
    await db.exec(`delete from shop_subscriptions; delete from tontines`)
  })

  it('applique le plafond de membres par tontine', async () => {
    await as(OWNER)
    const tontineId = await createTontine('Rentrée')
    for (let i = 0; i < 20; i++) await addMember(tontineId, `Client ${i}`)
    await expect(addMember(tontineId, 'De trop')).rejects.toThrow(/plan_limit_exceeded/)
    await asAdmin()
    await db.exec('delete from tontine_members; delete from tontines')
  })

  it('réserve tout au propriétaire et aux managers de la boutique', async () => {
    await as(OWNER)
    const tontineId = await createTontine('Fêtes')
    const memberId = await addMember(tontineId, 'Fatou')
    await pay(memberId, 5000)

    await as(MANAGER)
    await pay(memberId, 5000)
    expect(await rows('select id from tontine_contributions')).toHaveLength(2)

    await as(VENDEUR)
    expect(await rows('select id from tontines')).toHaveLength(0)
    await expect(pay(memberId, 1000)).rejects.toThrow()

    await as(OTHER_OWNER)
    expect(await rows('select id from tontine_members')).toHaveLength(0)
    await expect(pay(memberId, 1000)).rejects.toThrow()
    await expect(rows(`select * from tontine_summaries('${SHOP}')`)).rejects.toThrow(/not authorized/)
    await expect(rows(`select * from tontine_member_balances('${tontineId}')`)).rejects.toThrow(/not authorized/)
    await expect(db.exec(`select cancel_tontine_contribution((select id from tontine_contributions limit 1), 'x')`)).rejects.toThrow()

    await asAdmin()
    await db.exec('delete from tontine_contributions; delete from tontine_members; delete from tontines')
  })

  it('garde les versements intacts : ni modification ni suppression, annulation motivée seulement', async () => {
    await as(OWNER)
    const tontineId = await createTontine('Tabaski')
    const memberId = await addMember(tontineId, 'Moussa')
    await pay(memberId, 5000)
    await pay(memberId, 7000)
    const { id } = await one<{ id: string }>('select id from tontine_contributions where amount = 7000')

    await expect(db.exec(`update tontine_contributions set amount = 1 where id = '${id}'`)).rejects.toThrow(/permission denied/)
    await expect(db.exec(`delete from tontine_contributions where id = '${id}'`)).rejects.toThrow(/permission denied/)
    await expect(db.exec(`update tontine_members set status = 'settled' where id = '${memberId}'`)).rejects.toThrow(/permission denied/)

    await expect(db.exec(`select cancel_tontine_contribution('${id}', '  ')`)).rejects.toThrow(/reason_required/)
    await db.exec(`select cancel_tontine_contribution('${id}', 'Saisi deux fois')`)
    await expect(db.exec(`select cancel_tontine_contribution('${id}', 'encore')`)).rejects.toThrow(/already_cancelled/)

    const [balance] = await rows<{ saved: number; contributions_count: number }>(`select saved::int, contributions_count from tontine_member_balances('${tontineId}')`)
    expect(balance).toEqual({ saved: 5000, contributions_count: 1 })

    await asAdmin()
    await db.exec('delete from tontine_contributions; delete from tontine_members; delete from tontines')
  })

  it('remet l’épargne, la reporte en recette sur demande, et sait annuler la remise', async () => {
    await as(OWNER)
    const tontineId = await createTontine('Tabaski')
    const memberId = await addMember(tontineId, 'Awa')
    await pay(memberId, 50000)
    await pay(memberId, 25000)

    const { settled } = await one<{ settled: number }>(`select settle_tontine_member('${memberId}', 'goods', '2027-05-20', 'Mouton', true) as settled`)
    expect(settled).toBe(75000)
    const income = await rows<{ category: string; amount: number; kind: string }>('select category, amount, kind from finance_entries')
    expect(income).toEqual([{ category: 'tontine', amount: 75000, kind: 'income' }])

    await expect(pay(memberId, 1000)).rejects.toThrow(/member_settled/)
    const { id } = await one<{ id: string }>('select id from tontine_contributions limit 1')
    await expect(db.exec(`select cancel_tontine_contribution('${id}', 'x')`)).rejects.toThrow(/member_settled/)
    await expect(db.exec(`select settle_tontine_member('${memberId}', 'cash', '2027-05-20')`)).rejects.toThrow(/member_settled/)

    await db.exec(`select reopen_tontine_member('${memberId}')`)
    expect(await rows('select id from finance_entries')).toHaveLength(0)
    expect(await one(`select status, settled_amount from tontine_members where id = '${memberId}'`)).toEqual({ status: 'active', settled_amount: null })

    const { settled: refunded } = await one<{ settled: number }>(`select settle_tontine_member('${memberId}', 'cash', '2027-05-20', null, true) as settled`)
    expect(refunded).toBe(75000)
    expect(await rows('select id from finance_entries')).toHaveLength(0)

    await asAdmin()
    await db.exec('delete from tontine_contributions; delete from tontine_members; delete from tontines')
  })

  it('ne clôture qu’une fois l’épargne remise, puis refuse les nouveaux versements', async () => {
    await as(OWNER)
    const tontineId = await createTontine('Rentrée')
    const paid = await addMember(tontineId, 'Awa')
    await addMember(tontineId, 'Sans versement')
    await pay(paid, 10000)

    await expect(db.exec(`update tontines set status = 'closed' where id = '${tontineId}'`)).rejects.toThrow(/tontine_has_unsettled_savings/)

    const [summary] = await rows<{ members_count: number; settled_members: number; collected: number; paid_out: number }>(
      `select members_count, settled_members, collected::int, paid_out::int from tontine_summaries('${SHOP}')`,
    )
    expect(summary).toEqual({ members_count: 2, settled_members: 0, collected: 10000, paid_out: 0 })

    await db.exec(`select settle_tontine_member('${paid}', 'goods', '2027-05-20')`)
    await db.exec(`update tontines set status = 'closed' where id = '${tontineId}'`)
    await expect(pay(paid, 1000)).rejects.toThrow(/tontine_closed/)
    await expect(addMember(tontineId, 'Tard')).rejects.toThrow(/tontine_closed/)
    await expect(db.exec(`select reopen_tontine_member('${paid}')`)).rejects.toThrow(/tontine_closed/)

    const [after] = await rows<{ collected: number; paid_out: number }>(`select collected::int, paid_out::int from tontine_summaries('${SHOP}')`)
    expect(after).toEqual({ collected: 10000, paid_out: 10000 })

    await asAdmin()
    await db.exec('delete from tontine_contributions; delete from tontine_members; delete from tontines')
  })

  it('empêche de supprimer une tontine ou un membre qui a des versements, mais suit la suppression de la boutique', async () => {
    await as(OWNER)
    const tontineId = await createTontine('Fêtes')
    const memberId = await addMember(tontineId, 'Awa')
    const empty = await addMember(tontineId, 'Erreur de saisie')
    await pay(memberId, 5000)

    await db.exec(`delete from tontine_members where id = '${empty}'`)
    await expect(db.exec(`delete from tontine_members where id = '${memberId}'`)).rejects.toThrow(/foreign key/)
    await expect(db.exec(`delete from tontines where id = '${tontineId}'`)).rejects.toThrow(/foreign key/)

    await asAdmin()
    await db.exec(`delete from shop_members where shop_id = '${SHOP}'; delete from shops where id = '${SHOP}'`)
    expect(await rows('select id from tontine_contributions')).toHaveLength(0)
    expect(await rows('select id from tontines')).toHaveLength(0)
  })
})
