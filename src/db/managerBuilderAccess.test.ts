import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

/**
 * Vérifie que 0145 corrige bien l'oubli de 0054/0062 : un manager (via
 * shop_members) doit avoir le même accès que le propriétaire sur l'historique
 * de publication et les palettes sauvegardées du store builder. Un tiers sans
 * lien avec la boutique ne doit rien voir ni pouvoir écrire.
 */

const MIGRATIONS = path.resolve(import.meta.dirname, '../../supabase/migrations')
const read = (name: string) => readFileSync(path.join(MIGRATIONS, name), 'utf8')

const SHOP = '00000000-0000-0000-0000-0000000000a1'
const OWNER = '00000000-0000-0000-0000-0000000000b1'
const MANAGER = '00000000-0000-0000-0000-0000000000c1'
const VENDEUR = '00000000-0000-0000-0000-0000000000d1'
const OUTSIDER = '00000000-0000-0000-0000-0000000000e1'

let db: PGlite

const asUser = async (uid: string) => {
  await db.exec(`set app.uid = '${uid}'`)
  await db.exec('set role authenticated')
}
const asAnonymous = async () => {
  await db.exec('reset role')
  await db.exec(`set app.uid = ''`)
}

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true),'')::uuid $$;
    create table auth.users(id uuid primary key);
    create table public.shops(id uuid primary key default gen_random_uuid(), owner_id uuid not null);
    insert into public.shops(id, owner_id) values ('${SHOP}', '${OWNER}');
  `)
  await db.exec(read('0093_shop_members.sql').match(/create table public\.shop_members[\s\S]*?\);/)![0])
  await db.exec(read('0093_shop_members.sql').match(/create or replace function public\.shop_role[\s\S]*?\$\$;/)![0])
  await db.exec(`
    insert into auth.users(id) values ('${MANAGER}'), ('${VENDEUR}');
    insert into public.shop_members(shop_id, email, user_id, role) values
    ('${SHOP}', 'manager@example.sn', '${MANAGER}', 'manager'),
    ('${SHOP}', 'vendeur@example.sn', '${VENDEUR}', 'vendeur')`)
  await db.exec(read('0054_shop_publish_history.sql'))
  await db.exec(read('0062_shop_saved_themes.sql'))
  await db.exec(read('0145_manager_publish_history_and_themes.sql'))
  await db.exec(`
    grant select on public.shops to authenticated;
    grant select, insert, update, delete on public.shop_publish_history, public.shop_saved_themes to authenticated;
  `)
}, 20000)

describe('historique de publication (0054 + 0145)', () => {
  it('le propriétaire lit et écrit son historique', async () => {
    await asUser(OWNER)
    await db.exec(`insert into shop_publish_history(shop_id, theme_color, theme_config) values ('${SHOP}', '#c2481c', '{}')`)
    const rows = (await db.query(`select id from shop_publish_history where shop_id = '${SHOP}'`)).rows
    expect(rows.length).toBe(1)
  })

  it('un manager lit et écrit le même historique — plus le trou de 0054', async () => {
    await asUser(MANAGER)
    await db.exec(`insert into shop_publish_history(shop_id, theme_color, theme_config) values ('${SHOP}', '#221f45', '{}')`)
    const rows = (await db.query(`select id from shop_publish_history where shop_id = '${SHOP}'`)).rows
    expect(rows.length).toBe(2)
  })

  it('un vendeur ni un tiers ne voient ou n’écrivent rien', async () => {
    await asUser(VENDEUR)
    expect((await db.query(`select id from shop_publish_history where shop_id = '${SHOP}'`)).rows.length).toBe(0)
    await expect(
      db.query(`insert into shop_publish_history(shop_id, theme_color, theme_config) values ('${SHOP}', '#000000', '{}')`),
    ).rejects.toThrow(/row-level security/)

    await asUser(OUTSIDER)
    expect((await db.query(`select id from shop_publish_history where shop_id = '${SHOP}'`)).rows.length).toBe(0)

    await asAnonymous()
  })
})

describe('palettes sauvegardées (0062 + 0145)', () => {
  it('le propriétaire gère ses palettes', async () => {
    await asUser(OWNER)
    await db.exec(`insert into shop_saved_themes(shop_id, name, theme_color, theme_config) values ('${SHOP}', 'Terracotta', '#c2481c', '{}')`)
    expect((await db.query(`select id from shop_saved_themes where shop_id = '${SHOP}'`)).rows.length).toBe(1)
  })

  it('un manager gère les mêmes palettes — plus le trou de 0062', async () => {
    await asUser(MANAGER)
    await db.exec(`insert into shop_saved_themes(shop_id, name, theme_color, theme_config) values ('${SHOP}', 'Indigo', '#221f45', '{}')`)
    const rows = (await db.query(`select id from shop_saved_themes where shop_id = '${SHOP}'`)).rows
    expect(rows.length).toBe(2)
  })

  it('un vendeur ni un tiers n’y touchent', async () => {
    await asUser(VENDEUR)
    expect((await db.query(`select id from shop_saved_themes where shop_id = '${SHOP}'`)).rows.length).toBe(0)
    await expect(
      db.query(`insert into shop_saved_themes(shop_id, name, theme_color, theme_config) values ('${SHOP}', 'Interdit', '#000000', '{}')`),
    ).rejects.toThrow(/row-level security/)

    await asUser(OUTSIDER)
    expect((await db.query(`select id from shop_saved_themes where shop_id = '${SHOP}'`)).rows.length).toBe(0)

    await asAnonymous()
  })
})
