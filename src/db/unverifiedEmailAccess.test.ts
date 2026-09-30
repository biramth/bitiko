import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

/**
 * Migration 0154 sur un vrai Postgres (PGlite) avec un schéma minimal :
 * boutique hors ligne tant que l'email du propriétaire n'est pas confirmé.
 */

const MIGRATIONS = path.resolve(import.meta.dirname, '../../supabase/migrations')
const read = (name: string) => readFileSync(path.join(MIGRATIONS, name), 'utf8')

const VERIFIED = '00000000-0000-0000-0000-0000000000b1'
const UNVERIFIED = '00000000-0000-0000-0000-0000000000b2'
const LEGACY_SHOP = '00000000-0000-0000-0000-0000000000a0'

let db: PGlite
const rows = async <T = Record<string, unknown>>(sql: string) => (await db.query<T>(sql)).rows
const asUser = (uid: string | null) => db.exec(`select set_config('app.uid', '${uid ?? ''}', false)`)

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true),'')::uuid $$;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, created_at timestamptz not null default now());
    create table public.shops(id uuid primary key default gen_random_uuid(), owner_id uuid not null, name text, suspended_at timestamptz);
    create table public.shop_members(shop_id uuid, user_id uuid, role text);
    create table public.platform_members(user_id uuid, created_by uuid);
    create table public.campaigns(id uuid primary key default gen_random_uuid(), created_by uuid);
    create table public.orders(id uuid primary key default gen_random_uuid(), shop_id uuid references public.shops(id), total numeric not null default 0);
    insert into auth.users(id, email, email_confirmed_at) values
      ('${VERIFIED}', 'ok@example.sn', now()),
      ('${UNVERIFIED}', 'pending@example.sn', null);
    insert into public.shops(id, owner_id, name) values ('${LEGACY_SHOP}', '${UNVERIFIED}', 'Ancienne');
  `)
  await db.exec(read('0093_shop_members.sql').match(/create or replace function public\.shop_role[\s\S]*?\$\$;/)![0])
  await db.exec(read('0154_unverified_email_access.sql'))
  await db.exec(`
    create trigger orders_block_suspended before insert on public.orders
      for each row execute function public.block_suspended_shop_writes();
  `)
}, 60_000)

describe('accès sans email vérifié (0154)', () => {
  it('marque hors ligne les boutiques existantes dont le propriétaire n’est pas vérifié', async () => {
    const [shop] = await rows<{ owner_email_verified: boolean }>(`select owner_email_verified from shops where id = '${LEGACY_SHOP}'`)
    expect(shop.owner_email_verified).toBe(false)
  })

  it('calcule le statut à la création, quelle que soit la valeur envoyée', async () => {
    await asUser(UNVERIFIED)
    const [pending] = await rows<{ owner_email_verified: boolean }>(
      `insert into shops(owner_id, name, owner_email_verified) values ('${UNVERIFIED}', 'Pending', true) returning owner_email_verified`,
    )
    expect(pending.owner_email_verified).toBe(false)
    await asUser(VERIFIED)
    const [ok] = await rows<{ owner_email_verified: boolean }>(
      `insert into shops(owner_id, name) values ('${VERIFIED}', 'Ok') returning owner_email_verified`,
    )
    expect(ok.owner_email_verified).toBe(true)
    await asUser(null)
  })

  it('empêche le propriétaire de se mettre en ligne ou de lever une suspension lui-même', async () => {
    await asUser(UNVERIFIED)
    await db.exec(`update shops set owner_email_verified = true, suspended_at = now(), name = 'Renommée' where id = '${LEGACY_SHOP}'`)
    await asUser(null)
    const [shop] = await rows<{ owner_email_verified: boolean; suspended_at: string | null; name: string }>(
      `select owner_email_verified, suspended_at, name from shops where id = '${LEGACY_SHOP}'`,
    )
    expect(shop).toMatchObject({ owner_email_verified: false, suspended_at: null, name: 'Renommée' })
  })

  it('refuse les commandes publiques mais laisse l’équipe en saisir', async () => {
    await asUser(null)
    await expect(db.exec(`insert into orders(shop_id, total) values ('${LEGACY_SHOP}', 1000)`)).rejects.toThrow(/shop_not_live/)
    await asUser(UNVERIFIED)
    await db.exec(`insert into orders(shop_id, total) values ('${LEGACY_SHOP}', 1000)`)
    await asUser(null)
  })

  it('met la boutique en ligne dès que l’email est confirmé', async () => {
    await db.exec(`update auth.users set email_confirmed_at = now() where id = '${UNVERIFIED}'`)
    const shops = await rows<{ owner_email_verified: boolean }>(`select owner_email_verified from shops where owner_id = '${UNVERIFIED}'`)
    expect(shops.every((s) => s.owner_email_verified)).toBe(true)
    await db.exec(`insert into orders(shop_id, total) values ('${LEGACY_SHOP}', 2000)`)
  })

  it('ne supprime jamais un compte non vérifié qui possède une boutique', async () => {
    const stale = '00000000-0000-0000-0000-0000000000c1'
    const owner = '00000000-0000-0000-0000-0000000000c2'
    await db.exec(`
      insert into auth.users(id, email, created_at) values
        ('${stale}', 'stale@example.sn', now() - interval '8 days'),
        ('${owner}', 'owner@example.sn', now() - interval '8 days');
      insert into shops(owner_id, name) values ('${owner}', 'Garde');
    `)
    const [{ n }] = await rows<{ n: number }>('select public.cleanup_unverified_users() as n')
    expect(n).toBe(1)
    const left = await rows<{ id: string }>(`select id from auth.users where id in ('${stale}', '${owner}')`)
    expect(left.map((r) => r.id)).toEqual([owner])
  })
})
