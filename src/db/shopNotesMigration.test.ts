import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

/** Migration 0157 (bloc-notes) sur un vrai Postgres (PGlite) : accès réservé au propriétaire et aux managers. */

const MIGRATIONS = path.resolve(import.meta.dirname, '../../supabase/migrations')
const read = (name: string) => readFileSync(path.join(MIGRATIONS, name), 'utf8')

const SHOP = '00000000-0000-0000-0000-0000000000a1'
const OWNER = '00000000-0000-0000-0000-0000000000b1'
const OTHER_OWNER = '00000000-0000-0000-0000-0000000000b2'
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
    create table public.shops(id uuid primary key, owner_id uuid not null);
    create table public.shop_members(shop_id uuid, user_id uuid, role text);
    create function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
    insert into public.shops values ('${SHOP}', '${OWNER}'), ('00000000-0000-0000-0000-0000000000a2', '${OTHER_OWNER}');
    insert into public.shop_members values ('${SHOP}', '${MANAGER}', 'manager'), ('${SHOP}', '${VENDEUR}', 'vendeur');
  `)
  await db.exec(read('0093_shop_members.sql').match(/create or replace function public\.shop_role[\s\S]*?\$\$;/)![0])
  await db.exec(read('0157_shop_notes.sql'))
  await db.exec(read('0157_shop_notes.sql'))
}, 60_000)

describe('bloc-notes (0157)', () => {
  it('laisse le propriétaire et les managers écrire, modifier, épingler et supprimer', async () => {
    await as(OWNER)
    await db.exec(`insert into shop_notes(shop_id, title, body) values ('${SHOP}', 'Fournisseur tissu', 'Mme Ba : 77 000 00 00')`)
    await as(MANAGER)
    await db.exec(`update shop_notes set pinned = true, color = 'yellow'`)
    expect(await rows('select title, pinned, color from shop_notes')).toEqual([{ title: 'Fournisseur tissu', pinned: true, color: 'yellow' }])
    await db.exec('delete from shop_notes')
    expect(await rows('select id from shop_notes')).toHaveLength(0)
  })

  it('cache les notes au vendeur et aux autres boutiques', async () => {
    await as(OWNER)
    await db.exec(`insert into shop_notes(shop_id, body) values ('${SHOP}', 'Commander du riz')`)
    for (const uid of [VENDEUR, OTHER_OWNER]) {
      await as(uid)
      expect(await rows('select id from shop_notes')).toHaveLength(0)
      await expect(db.exec(`insert into shop_notes(shop_id, body) values ('${SHOP}', 'intrus')`)).rejects.toThrow()
    }
  })

  it('refuse une note vide ou une couleur inconnue', async () => {
    await as(OWNER)
    await expect(db.exec(`insert into shop_notes(shop_id, title, body) values ('${SHOP}', '  ', '  ')`)).rejects.toThrow(/shop_notes_not_empty/)
    await expect(db.exec(`insert into shop_notes(shop_id, body, color) values ('${SHOP}', 'x', 'rouge')`)).rejects.toThrow()
  })
})
