import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

const MIGRATIONS = path.resolve(import.meta.dirname, '../../supabase/migrations')
const read = (name: string) => readFileSync(path.join(MIGRATIONS, name), 'utf8')

const AWA = '00000000-0000-0000-0000-0000000000a1'
const FATOU = '00000000-0000-0000-0000-0000000000a2'
const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc'

let db: PGlite

const as = async <T = Record<string, unknown>>(uid: string | null, sql: string) =>
  db.transaction(async (tx) => {
    await tx.exec(`set local app.uid = '${uid ?? ''}'; set local role authenticated;`)
    return (await tx.query<T>(sql)).rows
  })

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true),'')::uuid $$;
    grant usage on schema auth to authenticated;
    grant execute on function auth.uid() to authenticated;
    insert into auth.users(id) values ('${AWA}'), ('${FATOU}');
  `)
  await db.exec(read('0149_push_subscriptions_and_realtime.sql'))
  await db.exec(`grant select, delete on public.push_subscriptions to authenticated;`)
}, 60_000)

describe('push_subscriptions (0149)', () => {
  it('enregistre l’appareil du compte connecté', async () => {
    await as(AWA, `select register_push_subscription('${ENDPOINT}', 'p256', 'auth', 'Chrome')`)
    const rows = await as<{ endpoint: string }>(AWA, `select endpoint from push_subscriptions`)
    expect(rows.map((r) => r.endpoint)).toEqual([ENDPOINT])
  })

  it('ne montre pas les appareils des autres comptes', async () => {
    expect(await as(FATOU, `select id from push_subscriptions`)).toEqual([])
  })

  it('un navigateur partagé suit le dernier compte qui active les alertes', async () => {
    await as(FATOU, `select register_push_subscription('${ENDPOINT}', 'p256-2', 'auth-2', 'Chrome')`)
    expect(await as(AWA, `select id from push_subscriptions`)).toEqual([])
    const rows = (await db.query<{ user_id: string; p256dh: string }>(`select user_id, p256dh from push_subscriptions`)).rows
    expect(rows).toEqual([{ user_id: FATOU, p256dh: 'p256-2' }])
  })

  it('refuse un appel anonyme et un endpoint non https', async () => {
    await expect(as(null, `select register_push_subscription('${ENDPOINT}', 'k', 'a')`)).rejects.toThrow(/not_authenticated/)
    await expect(as(AWA, `select register_push_subscription('http://evil.test/x', 'k', 'a')`)).rejects.toThrow(/invalid_endpoint/)
  })

  it('n’autorise pas l’écriture directe dans la table', async () => {
    await expect(
      as(AWA, `insert into push_subscriptions(user_id, endpoint, p256dh, auth) values ('${AWA}', 'https://x.test/1', 'k', 'a')`),
    ).rejects.toThrow()
  })

  it('le propriétaire supprime son appareil', async () => {
    await as(FATOU, `delete from push_subscriptions where endpoint = '${ENDPOINT}'`)
    expect((await db.query(`select id from push_subscriptions`)).rows).toEqual([])
  })
})
