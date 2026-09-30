import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

/** Migration 0154 sur un vrai Postgres (PGlite) : suspended_at réservé à la plateforme. */

const MIGRATION = readFileSync(
  path.resolve(import.meta.dirname, '../../supabase/migrations/0154_protect_shop_suspension.sql'),
  'utf8',
)

const OWNER = '00000000-0000-0000-0000-0000000000b1'
const SHOP = '00000000-0000-0000-0000-0000000000a1'

let db: PGlite
const rows = async <T = Record<string, unknown>>(sql: string) => (await db.query<T>(sql)).rows
const asUser = (uid: string | null) => db.exec(`select set_config('app.uid', '${uid ?? ''}', false)`)

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true),'')::uuid $$;
    create table public.shops(id uuid primary key, owner_id uuid not null, name text, suspended_at timestamptz);
    insert into public.shops(id, owner_id, name, suspended_at) values ('${SHOP}', '${OWNER}', 'Boutique', now());
  `)
  await db.exec(MIGRATION)
}, 60_000)

describe('protection de la suspension (0154)', () => {
  it('empêche le propriétaire de lever sa suspension, sans bloquer ses autres modifications', async () => {
    await asUser(OWNER)
    await db.exec(`update shops set suspended_at = null, name = 'Renommée' where id = '${SHOP}'`)
    await asUser(null)
    const [shop] = await rows<{ suspended_at: string | null; name: string }>(`select suspended_at, name from shops where id = '${SHOP}'`)
    expect(shop.name).toBe('Renommée')
    expect(shop.suspended_at).not.toBeNull()
  })

  it('laisse le service_role suspendre et rétablir', async () => {
    await asUser(null)
    await db.exec(`update shops set suspended_at = null where id = '${SHOP}'`)
    const [shop] = await rows<{ suspended_at: string | null }>(`select suspended_at from shops where id = '${SHOP}'`)
    expect(shop.suspended_at).toBeNull()
  })
})
