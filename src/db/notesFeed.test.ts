import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

/** Migration 0158 sur un vrai Postgres (PGlite) : toutes les notes des fiches, réservées au propriétaire et aux managers. */

const MIGRATIONS = path.resolve(import.meta.dirname, '../../supabase/migrations')
const read = (name: string) => readFileSync(path.join(MIGRATIONS, name), 'utf8')

const SHOP = '00000000-0000-0000-0000-0000000000a1'
const OTHER_SHOP = '00000000-0000-0000-0000-0000000000a2'
const OWNER = '00000000-0000-0000-0000-0000000000b1'
const MANAGER = '00000000-0000-0000-0000-0000000000c1'
const VENDEUR = '00000000-0000-0000-0000-0000000000c2'

let db: PGlite
const rows = async <T = Record<string, unknown>>(sql: string) => (await db.query<T>(sql)).rows
const as = (uid: string) => db.exec(`reset role; select set_config('app.uid', '${uid}', false); set role authenticated;`)

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create schema auth;
    grant usage on schema auth to authenticated;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true),'')::uuid $$;
    create table public.countries(code text primary key, dial_code text not null, trunk_prefix text not null default '0', national_number_length integer not null, national_regex text not null);
    insert into public.countries values ('SN', '+221', '0', 9, '^[37][0-9]{8}$');
    create table public.shops(id uuid primary key, owner_id uuid not null, country_code text not null default 'SN');
    create table public.shop_members(shop_id uuid, user_id uuid, role text);
    create function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
    create table public.plans(key text primary key);
    create table public.plan_limits(plan_key text not null references public.plans(key), code text not null, max_value integer, primary key (plan_key, code));
    insert into public.plans values ('free'),('essential'),('pro');
    create table public.shop_subscriptions(shop_id uuid primary key, plan text not null, status text not null default 'active', current_period_end timestamptz);
    create table public.orders(id uuid primary key default gen_random_uuid(), shop_id uuid not null, order_number text not null, customer_name text not null, total numeric(12,2) not null default 0, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
    create table public.appointments(id uuid primary key default gen_random_uuid(), shop_id uuid not null, customer_name text not null, service_name text, start_at timestamptz not null, notes text, created_at timestamptz not null default now());
    create table public.reservations(id uuid primary key default gen_random_uuid(), shop_id uuid not null, customer_name text not null, party_size integer not null, start_at timestamptz not null, notes text, updated_at timestamptz not null default now());
    insert into public.shops(id, owner_id) values ('${SHOP}', '${OWNER}'), ('${OTHER_SHOP}', '00000000-0000-0000-0000-0000000000b2');
    insert into public.shop_members values ('${SHOP}', '${MANAGER}', 'manager'), ('${SHOP}', '${VENDEUR}', 'vendeur');
  `)
  await db.exec(read('0027_enforce_plan_limits_server_side.sql').match(/create or replace function public\.effective_plan_key[\s\S]*?\$\$;/)![0])
  await db.exec(read('0093_shop_members.sql').match(/create or replace function public\.shop_role[\s\S]*?\$\$;/)![0])
  await db.exec(read('0125_plan_limits_services.sql').match(/create or replace function public\.plan_limit\(p_plan[\s\S]*?\$\$;/)![0])
  await db.exec(read('0128_countries_and_generic_phones.sql').match(/create or replace function public\.normalize_phone[\s\S]*?\n\$\$;/)![0])
  await db.exec(read('0130_finance_tools.sql').split('-- ── Recettes automatiques')[0])
  await db.exec(read('0156_tontines.sql'))
  await db.exec(read('0158_notes_feed.sql'))
  await db.exec(read('0158_notes_feed.sql'))

  await db.exec(`
    insert into orders(shop_id, order_number, customer_name, total, notes, updated_at) values
      ('${SHOP}', 'CMD-1042', 'Fatou', 25000, 'Livrer après 18 h', now() - interval '3 days'),
      ('${SHOP}', 'CMD-1043', 'Ibou', 1000, '   ', now()),
      ('${OTHER_SHOP}', 'CMD-9', 'Autre', 1000, 'Note d''une autre boutique', now());
    insert into finance_entries(shop_id, kind, category, label, amount, note) values ('${SHOP}', 'expense', 'stock', 'Tissu', 30000, 'Facture 42');
    insert into appointments(shop_id, customer_name, service_name, start_at, notes) values ('${SHOP}', 'Awa', 'Tresses', now(), 'Allergie');
    insert into reservations(shop_id, customer_name, party_size, start_at, notes) values ('${SHOP}', 'Moussa', 4, now(), 'Terrasse');
  `)
  const [{ id: tontineId }] = await rows<{ id: string }>(
    `insert into tontines(shop_id, name, installment_amount, end_date, note) values ('${SHOP}', 'Tabaski', 5000, current_date + 200, 'Mouton à 150 000') returning id`,
  )
  const [{ id: memberId }] = await rows<{ id: string }>(
    `insert into tontine_members(tontine_id, shop_id, name, target_amount, note) values ('${tontineId}', '${SHOP}', 'Awa', 150000, 'Veut un bélier') returning id`,
  )
  await db.exec(`insert into tontine_contributions(member_id, amount, note) values ('${memberId}', 5000, 'Payé par sa sœur'), ('${memberId}', 7000, null)`)
  await as(OWNER)
  await db.exec(`select cancel_tontine_contribution((select id from tontine_contributions where amount = 7000), 'Saisi deux fois')`)
  await db.exec(`select settle_tontine_member('${memberId}', 'goods', current_date, '1 bélier')`)
}, 60_000)

describe('toutes les notes (0158)', () => {
  it('regroupe les notes de toutes les fiches de la boutique, sans les vides ni celles des autres boutiques', async () => {
    await as(MANAGER)
    const feed = await rows<{ source: string; title: string; person: string | null; note: string }>(
      `select source, title, person, note from shop_notes_feed('${SHOP}') order by source`,
    )
    expect(feed).toEqual([
      { source: 'appointment', title: 'Tresses', person: 'Awa', note: 'Allergie' },
      { source: 'finance', title: 'Tissu', person: null, note: 'Facture 42' },
      { source: 'order', title: 'CMD-1042', person: 'Fatou', note: 'Livrer après 18 h' },
      { source: 'reservation', title: '4 pers.', person: 'Moussa', note: 'Terrasse' },
      { source: 'tontine', title: 'Tabaski', person: null, note: 'Mouton à 150 000' },
      { source: 'tontine_cancel', title: 'Tabaski', person: 'Awa', note: 'Saisi deux fois' },
      { source: 'tontine_contribution', title: 'Tabaski', person: 'Awa', note: 'Payé par sa sœur' },
      { source: 'tontine_member', title: 'Tabaski', person: 'Awa', note: 'Veut un bélier' },
      { source: 'tontine_settlement', title: 'Tabaski', person: 'Awa', note: '1 bélier' },
    ])
  })

  it('classe du plus récent au plus ancien et respecte la limite', async () => {
    await as(OWNER)
    const feed = await rows<{ source: string }>(`select source from shop_notes_feed('${SHOP}', 100)`)
    expect(feed.at(-1)?.source).toBe('order')
    expect(await rows(`select * from shop_notes_feed('${SHOP}', 2)`)).toHaveLength(2)
  })

  it('refuse le vendeur et les autres boutiques', async () => {
    await as(VENDEUR)
    await expect(rows(`select * from shop_notes_feed('${SHOP}')`)).rejects.toThrow(/not authorized/)
    await as('00000000-0000-0000-0000-0000000000b2')
    await expect(rows(`select * from shop_notes_feed('${SHOP}')`)).rejects.toThrow(/not authorized/)
  })
})
