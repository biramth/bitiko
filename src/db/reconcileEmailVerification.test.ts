import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { describe, expect, it } from 'vitest'

/**
 * Migration 0155 sur un vrai Postgres (PGlite) : même état final que la base
 * ait reçu la première version de 0154 (statut « propriétaire vérifié ») ou
 * celle du dépôt (garde de suspension seule).
 */

const MIGRATIONS = path.resolve(import.meta.dirname, '../../supabase/migrations')
const read = (name: string) => readFileSync(path.join(MIGRATIONS, name), 'utf8')

const OWNER = '00000000-0000-0000-0000-0000000000b1'
const SHOP = '00000000-0000-0000-0000-0000000000a1'

const BASE_SCHEMA = `
  create role anon; create role authenticated; create schema auth;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true),'')::uuid $$;
  create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, created_at timestamptz not null default now());
  create table public.shops(id uuid primary key, owner_id uuid not null, name text, suspended_at timestamptz);
  create table public.shop_members(shop_id uuid, user_id uuid);
  create table public.platform_members(user_id uuid, created_by uuid);
  create table public.campaigns(id uuid primary key default gen_random_uuid(), created_by uuid);
  create table public.orders(id uuid primary key default gen_random_uuid(), shop_id uuid references public.shops(id));
  insert into auth.users(id, email, email_confirmed_at) values ('${OWNER}', 'ok@example.sn', now());
  insert into public.shops(id, owner_id, name) values ('${SHOP}', '${OWNER}', 'Boutique');
`

// Artefacts laissés par la première version de 0154 (appliquée en dev et en prod).
const FIRST_0154_STATE = `
  alter table public.shops add column owner_email_verified boolean not null default true;
  create function public.set_shop_owner_email_verified() returns trigger language plpgsql as $$ begin return new; end $$;
  create trigger shops_set_owner_email_verified before insert on public.shops for each row execute function public.set_shop_owner_email_verified();
  create function public.sync_shop_owner_email_verified() returns trigger language plpgsql as $$ begin return new; end $$;
  create trigger on_auth_user_email_confirmed after update of email_confirmed_at on auth.users for each row execute function public.sync_shop_owner_email_verified();
  create function public.protect_shop_platform_columns() returns trigger language plpgsql as $$
  begin new.owner_email_verified := old.owner_email_verified; new.suspended_at := old.suspended_at; return new; end $$;
  create trigger shops_protect_platform_columns before update on public.shops for each row execute function public.protect_shop_platform_columns();
`

async function setup(variant: 'first' | 'repo') {
  const db = new PGlite()
  await db.exec(BASE_SCHEMA)
  await db.exec(variant === 'first' ? FIRST_0154_STATE : read('0154_protect_shop_suspension.sql'))
  await db.exec(read('0155_reconcile_email_verification.sql'))
  await db.exec(`
    create trigger orders_block_suspended before insert on public.orders
      for each row execute function public.block_suspended_shop_writes();
  `)
  return db
}

describe.each(['first', 'repo'] as const)('réconciliation 0155 (0154 %s)', (variant) => {
  it('retire le statut propriétaire vérifié et ses triggers', async () => {
    const db = await setup(variant)
    const column = await db.query(
      `select 1 from information_schema.columns where table_name = 'shops' and column_name = 'owner_email_verified'`,
    )
    expect(column.rows).toHaveLength(0)
    const triggers = await db.query<{ tgname: string }>(
      `select tgname from pg_trigger where tgname in ('on_auth_user_email_confirmed', 'shops_set_owner_email_verified')`,
    )
    expect(triggers.rows).toHaveLength(0)
    await db.exec(`update auth.users set email_confirmed_at = now() where id = '${OWNER}'`)
  }, 30_000)

  it('garde suspended_at réservé à la plateforme', async () => {
    const db = await setup(variant)
    await db.exec(`update shops set suspended_at = now() where id = '${SHOP}'`)
    await db.exec(`select set_config('app.uid', '${OWNER}', false)`)
    await db.exec(`update shops set suspended_at = null, name = 'Renommée' where id = '${SHOP}'`)
    await db.exec(`select set_config('app.uid', '', false)`)
    const { rows } = await db.query<{ suspended_at: string | null; name: string }>(`select suspended_at, name from shops`)
    expect(rows[0].name).toBe('Renommée')
    expect(rows[0].suspended_at).not.toBeNull()
    await expect(db.exec(`insert into orders(shop_id) values ('${SHOP}')`)).rejects.toThrow(/shop_suspended/)
  }, 30_000)

  it('supprime les comptes non vérifiés après 24 h, jamais un propriétaire de boutique', async () => {
    const db = await setup(variant)
    const stale = '00000000-0000-0000-0000-0000000000c1'
    const fresh = '00000000-0000-0000-0000-0000000000c2'
    const owner = '00000000-0000-0000-0000-0000000000c3'
    await db.exec(`
      insert into auth.users(id, email, created_at) values
        ('${stale}', 'stale@example.sn', now() - interval '25 hours'),
        ('${fresh}', 'fresh@example.sn', now() - interval '2 hours'),
        ('${owner}', 'owner@example.sn', now() - interval '25 hours');
      insert into shops(id, owner_id, name) values (gen_random_uuid(), '${owner}', 'Garde');
    `)
    const { rows } = await db.query<{ n: number }>('select public.cleanup_unverified_users() as n')
    expect(rows[0].n).toBe(1)
    const left = await db.query<{ id: string }>(`select id from auth.users where id in ('${stale}', '${fresh}', '${owner}') order by id`)
    expect(left.rows.map((r) => r.id)).toEqual([fresh, owner])
  }, 30_000)
})
