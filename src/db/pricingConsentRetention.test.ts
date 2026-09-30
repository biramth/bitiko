import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

/** Migration 0153 sur un vrai Postgres (PGlite) avec un schéma minimal. */

const MIGRATION = readFileSync(
  path.resolve(import.meta.dirname, '../../supabase/migrations/0153_pricing_consent_retention.sql'),
  'utf8',
)

let db: PGlite
const rows = async <T = Record<string, unknown>>(sql: string) => (await db.query<T>(sql)).rows

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated;
    create table public.shops(id uuid primary key default gen_random_uuid(), owner_id uuid, name text, slug text, currency text, logo_url text, created_at timestamptz default now());
    create table public.profiles(id uuid primary key);
    create table public.admin_audit_log(id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now());
    create table public.campaigns(id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now());
    create table public.campaign_sends(id uuid primary key default gen_random_uuid(), campaign_id uuid references public.campaigns(id) on delete cascade, created_at timestamptz not null default now());
    create table public.push_subscriptions(id uuid primary key default gen_random_uuid(), last_seen_at timestamptz not null default now());
  `)
  await db.exec(MIGRATION)
}, 60_000)

describe('affichage fiscal, opt-in et conservation (0153)', () => {
  it('limite tax_display à net ou ttc, net par défaut', async () => {
    const [shop] = await rows<{ tax_display: string }>(`insert into shops(name) values ('A') returning tax_display`)
    expect(shop.tax_display).toBe('net')
    await expect(db.exec(`insert into shops(name, tax_display) values ('B', 'ht')`)).rejects.toThrow()
  })

  it('crée les profils sans consentement marketing par défaut', async () => {
    const [profile] = await rows<{ marketing_opt_in: boolean }>(
      `insert into profiles(id) values (gen_random_uuid()) returning marketing_opt_in`,
    )
    expect(profile.marketing_opt_in).toBe(false)
  })

  it('purge uniquement les lignes au-delà des durées de conservation', async () => {
    await db.exec(`
      insert into admin_audit_log(created_at) values (now() - interval '4 years'), (now());
      insert into campaigns(id, created_at) values ('00000000-0000-0000-0000-000000000001', now() - interval '4 years'), ('00000000-0000-0000-0000-000000000002', now());
      insert into campaign_sends(campaign_id, created_at) values ('00000000-0000-0000-0000-000000000002', now());
      insert into push_subscriptions(last_seen_at) values (now() - interval '14 months'), (now());
    `)
    const [{ deleted }] = await rows<{ deleted: number }>('select public.purge_old_compliance_rows() as deleted')
    expect(Number(deleted)).toBe(3)
    const counts = await rows<{ audit: number; campaigns: number; sends: number; push: number }>(`
      select (select count(*) from admin_audit_log)::int as audit, (select count(*) from campaigns)::int as campaigns,
             (select count(*) from campaign_sends)::int as sends, (select count(*) from push_subscriptions)::int as push
    `)
    expect(counts[0]).toEqual({ audit: 1, campaigns: 1, sends: 1, push: 1 })
  })
})
