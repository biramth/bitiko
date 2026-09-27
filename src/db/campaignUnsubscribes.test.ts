import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

const MIGRATIONS = path.resolve(import.meta.dirname, '../../supabase/migrations')
const read = (name: string) => readFileSync(path.join(MIGRATIONS, name), 'utf8')

const VIEWER = '00000000-0000-0000-0000-0000000000c1'
const OWNER_STAYS = '00000000-0000-0000-0000-0000000000a1'
const OWNER_UNSUBSCRIBED = '00000000-0000-0000-0000-0000000000a2'
const SHOP_STAYS = '00000000-0000-0000-0000-0000000000b1'
const SHOP_UNSUBSCRIBED = '00000000-0000-0000-0000-0000000000b2'

let db: PGlite

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;

    insert into auth.users(id) values ('${VIEWER}'), ('${OWNER_STAYS}'), ('${OWNER_UNSUBSCRIBED}');

    create table public.platform_members (user_id uuid primary key);
    create table public.shops (id uuid primary key default gen_random_uuid(), owner_id uuid not null, name text not null default '', slug text not null default '', currency text not null default 'XOF', logo_url text, created_at timestamptz not null default now());
    create table public.shop_subscriptions (shop_id uuid primary key references public.shops(id), plan text not null default 'free', status text not null default 'active');
    create table public.products (id uuid primary key default gen_random_uuid(), shop_id uuid references public.shops(id));

    create function public.is_platform_admin() returns boolean language sql stable as $$ select false $$;

    insert into public.platform_members(user_id) values ('${VIEWER}');
    insert into public.shops(id, owner_id, name, slug) values ('${SHOP_STAYS}', '${OWNER_STAYS}', 'Chez Awa', 'chez-awa');
    insert into public.shops(id, owner_id, name, slug) values ('${SHOP_UNSUBSCRIBED}', '${OWNER_UNSUBSCRIBED}', 'Salon Fatou', 'salon-fatou');
  `)
  await db.exec(read('0143_campaign_unsubscribes.sql'))
}, 60_000)

describe('platform_audience() exclut les comptes désabonnés (0143)', () => {
  it('inclut tout le monde avant désabonnement', async () => {
    const rows = (await db.query<{ owner_id: string }>(
      `select owner_id from platform_audience('{}'::jsonb, '${VIEWER}'::uuid)`,
    )).rows
    expect(rows.map((r) => r.owner_id).sort()).toEqual([OWNER_STAYS, OWNER_UNSUBSCRIBED].sort())
  })

  it('exclut la boutique d’un propriétaire désabonné, même s’il correspond aux filtres', async () => {
    await db.exec(`insert into public.campaign_unsubscribes(user_id) values ('${OWNER_UNSUBSCRIBED}')`)
    const rows = (await db.query<{ owner_id: string; slug: string }>(
      `select owner_id, slug from platform_audience('{}'::jsonb, '${VIEWER}'::uuid)`,
    )).rows
    expect(rows.map((r) => r.slug)).toEqual(['chez-awa'])
    expect(rows.map((r) => r.owner_id)).not.toContain(OWNER_UNSUBSCRIBED)
  })

  it('refuse un appelant qui n’est pas membre plateforme', async () => {
    await expect(
      db.query(`select owner_id from platform_audience('{}'::jsonb, '00000000-0000-0000-0000-000000009999'::uuid)`),
    ).rejects.toThrow(/Accès réservé/)
  })
})
