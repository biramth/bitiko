import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

const migration = readFileSync(path.resolve(import.meta.dirname, '../../supabase/migrations/0139_campaign_scheduling.sql'), 'utf8')

let db: PGlite

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key);
    create table public.campaigns(
      id uuid primary key default gen_random_uuid(),
      name text not null,
      subject text not null,
      body text not null,
      status text not null default 'draft'
    );
    alter table public.campaigns
      add constraint campaigns_status_check check (status in ('draft', 'sending', 'sent'));
  `)
  await db.exec(migration)
}, 60_000)

describe('programmation des campagnes (0139)', () => {
  it('ajoute scheduled_at/scheduled_by et le statut scheduled', async () => {
    await db.exec(
      `insert into public.campaigns(name, subject, body, status, scheduled_at) values ('Relance', 'Sujet', 'Contenu', 'scheduled', now() + interval '1 day')`,
    )
    const { rows } = await db.query<{ status: string }>(`select status from public.campaigns`)
    expect(rows.map((r) => r.status)).toEqual(['scheduled'])
  })

  it('refuse toujours un statut hors liste', async () => {
    await expect(
      db.exec(`insert into public.campaigns(name, subject, body, status) values ('X', 'S', 'B', 'nope')`),
    ).rejects.toThrow()
  })

  it('rejoue sans rien casser', async () => {
    await db.exec(migration)
    const { rows } = await db.query<{ count: string }>(`select count(*) from public.campaigns`)
    expect(Number(rows[0].count)).toBe(1)
  })
})
