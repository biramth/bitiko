import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

const migration = readFileSync(path.resolve(import.meta.dirname, '../../supabase/migrations/0137_onboarding_nudges.sql'), 'utf8')

let db: PGlite
const ids = (rows: { user_id: string }[]) => rows.map((r) => r.user_id).sort()
const candidates = async (args = '') =>
  (await db.query<{ user_id: string; email: string; full_name: string | null }>(`select * from get_onboarding_nudge_candidates(${args})`)).rows

const user = (id: string, opts: { hoursAgo: number; confirmed?: boolean; meta?: string }) =>
  `insert into auth.users(id, email, email_confirmed_at, created_at, raw_user_meta_data)
   values ('${id}', '${id}@example.sn', ${opts.confirmed === false ? 'null' : 'now()'}, now() - interval '${opts.hoursAgo} hours', '${opts.meta ?? '{}'}');`

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, created_at timestamptz default now(), raw_user_meta_data jsonb default '{}');
    create table public.shops(id uuid primary key default gen_random_uuid(), owner_id uuid not null);
    create table public.shop_members(id uuid primary key default gen_random_uuid(), user_id uuid);
    create table public.platform_members(user_id uuid primary key);
  `)
  await db.exec(migration)
  await db.exec(`
    ${user('00000000-0000-0000-0000-000000000001', { hoursAgo: 30, meta: '{"full_name":"Awa Diop"}' })}
    ${user('00000000-0000-0000-0000-000000000002', { hoursAgo: 5 })}
    ${user('00000000-0000-0000-0000-000000000003', { hoursAgo: 100 })}
    ${user('00000000-0000-0000-0000-000000000004', { hoursAgo: 30, confirmed: false })}
    ${user('00000000-0000-0000-0000-000000000005', { hoursAgo: 30 })}
    ${user('00000000-0000-0000-0000-000000000006', { hoursAgo: 30 })}
    ${user('00000000-0000-0000-0000-000000000007', { hoursAgo: 30 })}
    ${user('00000000-0000-0000-0000-000000000008', { hoursAgo: 40 })}
    insert into public.shops(owner_id) values ('00000000-0000-0000-0000-000000000005');
    insert into public.shop_members(user_id) values ('00000000-0000-0000-0000-000000000006');
    insert into public.platform_members(user_id) values ('00000000-0000-0000-0000-000000000007');
  `)
}, 60_000)

describe('get_onboarding_nudge_candidates (0137)', () => {
  it('ne retient que les comptes confirmés, dans la fenêtre, sans boutique ni équipe', async () => {
    const rows = await candidates()
    expect(ids(rows)).toEqual(['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000008'])
    expect(rows.find((r) => r.user_id.endsWith('1'))?.full_name).toBe('Awa Diop')
  })

  it('exclut un compte déjà relancé', async () => {
    await db.exec(`insert into public.onboarding_nudges(user_id) values ('00000000-0000-0000-0000-000000000001')`)
    expect(ids(await candidates())).toEqual(['00000000-0000-0000-0000-000000000008'])
  })

  it('respecte la limite', async () => {
    expect(await candidates(`p_limit => 0`)).toHaveLength(0)
  })

  it('exclut un compte qui a créé sa boutique entre-temps', async () => {
    await db.exec(`insert into public.shops(owner_id) values ('00000000-0000-0000-0000-000000000008')`)
    expect(await candidates()).toHaveLength(0)
  })

  it('est réservée à service_role (ni anon ni authenticated)', async () => {
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`)
      await expect(db.query(`select * from get_onboarding_nudge_candidates()`)).rejects.toThrow(/permission denied/)
      await expect(db.query(`select * from public.onboarding_nudges`)).rejects.toThrow(/permission denied/)
      await db.exec('reset role')
    }
    await db.exec(`set role service_role`)
    await expect(db.query(`select * from get_onboarding_nudge_candidates()`)).resolves.toBeTruthy()
    await db.exec('reset role')
  })
})
