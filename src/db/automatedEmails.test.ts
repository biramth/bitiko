import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

const migration = readFileSync(path.resolve(import.meta.dirname, '../../supabase/migrations/0138_automated_emails.sql'), 'utf8')

let db: PGlite

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key);
  `)
  await db.exec(migration)
}, 60_000)

describe('automated_emails (0138)', () => {
  it('plante les 3 emails avec le contenu éditable par défaut', async () => {
    const { rows } = await db.query<{ key: string; subject: string; is_enabled: boolean }>(
      `select key, subject, is_enabled from public.automated_emails order by key`,
    )
    expect(rows.map((r) => r.key)).toEqual(['plan-activated', 'renewal-reminder', 'welcome'])
    expect(rows.every((r) => r.is_enabled)).toBe(true)
    expect(rows.find((r) => r.key === 'welcome')?.subject).toContain('{{shop_name}}')
  })

  it('rejoue sans écraser une personnalisation de l’équipe', async () => {
    await db.exec(`update public.automated_emails set subject = 'Objet maison' where key = 'welcome'`)
    await db.exec(migration)
    const { rows } = await db.query<{ key: string; subject: string }>(`select key, subject from public.automated_emails`)
    expect(rows).toHaveLength(3)
    expect(rows.find((r) => r.key === 'welcome')?.subject).toBe('Objet maison')
  })

  it('refuse une clé hors liste', async () => {
    await expect(
      db.exec(`insert into public.automated_emails(key, subject, body) values ('nope', 's', 'b')`),
    ).rejects.toThrow()
  })

  it('est invisible de anon/authenticated (service_role uniquement)', async () => {
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`)
      await expect(db.query(`select * from public.automated_emails`)).rejects.toThrow(/permission denied/)
      await db.exec('reset role')
    }
  })
})
