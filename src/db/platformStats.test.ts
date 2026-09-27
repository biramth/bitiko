import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

const MIGRATIONS = path.resolve(import.meta.dirname, '../../supabase/migrations')
const read = (name: string) => readFileSync(path.join(MIGRATIONS, name), 'utf8')

const OWNER = '00000000-0000-0000-0000-0000000000a1'
const SHOP = '00000000-0000-0000-0000-0000000000b1'

let db: PGlite

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true),'')::uuid $$;

    create table public.platform_members (user_id uuid primary key);
    create table public.shops (id uuid primary key default gen_random_uuid(), owner_id uuid not null, name text not null default '', slug text not null default '', currency text not null default 'XOF');
    create table public.shop_subscriptions (shop_id uuid primary key references public.shops(id), plan text not null default 'free', status text not null default 'active');
    create table public.products (id uuid primary key default gen_random_uuid(), active boolean not null default true);
    create table public.orders (id uuid primary key default gen_random_uuid(), shop_id uuid references public.shops(id), status text not null default 'pending', total numeric(12,2) not null default 0, created_at timestamptz not null default now());
    create table public.page_views (
      id uuid primary key default gen_random_uuid(),
      shop_id uuid references public.shops(id) on delete cascade,
      user_id uuid,
      path text not null,
      session_id uuid not null,
      referrer text,
      device text,
      created_at timestamptz not null default now()
    );

    create function public.is_platform_admin() returns boolean language sql stable as $$
      select exists (select 1 from public.platform_members m where m.user_id = auth.uid());
    $$;
    create function public.is_internal_user(p_uid uuid) returns boolean language sql stable as $$
      select exists (select 1 from public.shops s where s.owner_id = p_uid)
          or exists (select 1 from public.platform_members m where m.user_id = p_uid);
    $$;

    insert into public.shops(id, owner_id) values ('${SHOP}', '${OWNER}');
    insert into public.platform_members(user_id) values ('00000000-0000-0000-0000-0000000000c1');
    select set_config('app.uid', '00000000-0000-0000-0000-0000000000c1', false);
  `)
  await db.exec(read('0141_restore_referrer_noise_filter.sql'))

  const view = (referrer: string | null, sessionId: string) =>
    `insert into public.page_views(path, session_id, referrer) values ('/', '${sessionId}', ${referrer ? `'${referrer}'` : 'null'});`
  await db.exec(`
    ${view('https://accounts.google.com/o/oauth2/...', '00000000-0000-0000-0000-000000001001')}
    ${view('https://myaccount.google.com/', '00000000-0000-0000-0000-000000001002')}
    ${view('https://accounts.youtube.com/', '00000000-0000-0000-0000-000000001003')}
    ${view('https://bitiko.shop/', '00000000-0000-0000-0000-000000001004')}
    ${view('https://jannah-house.bitiko.shop/', '00000000-0000-0000-0000-000000001005')}
    ${view('https://bitiko.shop/admin/login', '00000000-0000-0000-0000-000000001006')}
    ${view('https://vercel.com/biramths-projects', '00000000-0000-0000-0000-000000001007')}
    ${view('http://localhost:5173/', '00000000-0000-0000-0000-000000001008')}
    ${view('android-app://com.google.android.gm/', '00000000-0000-0000-0000-000000001009')}
    ${view('android-app://com.whatsapp/', '00000000-0000-0000-0000-000000001010')}
    ${view('https://www.instagram.com/', '00000000-0000-0000-0000-000000002001')}
    ${view('https://www.instagram.com/', '00000000-0000-0000-0000-000000002002')}
    ${view('https://www.google.com/search?q=bitiko', '00000000-0000-0000-0000-000000002003')}
    ${view('https://www.facebook.com/', '00000000-0000-0000-0000-000000002004')}
  `)
}, 60_000)

describe('get_platform_stats().top_referrers (0141 — régression de 0066)', () => {
  it('exclut les allers-retours OAuth, les liens internes et les lancements d’app natives', async () => {
    const [{ get_platform_stats: stats }] = (await db.query<{ get_platform_stats: { top_referrers: { referrer: string; visits: number }[] } }>(
      'select public.get_platform_stats()',
    )).rows
    const referrers = stats.top_referrers.map((r) => r.referrer)
    expect(referrers).not.toContain('https://accounts.google.com/o/oauth2/...')
    expect(referrers.some((r) => r.startsWith('https://myaccount.google.com'))).toBe(false)
    expect(referrers.some((r) => r.startsWith('https://accounts.youtube.com'))).toBe(false)
    expect(referrers.some((r) => r.includes('bitiko.shop'))).toBe(false)
    expect(referrers.some((r) => r.startsWith('https://vercel.com'))).toBe(false)
    expect(referrers.some((r) => r.startsWith('http://localhost'))).toBe(false)
    expect(referrers.some((r) => r.startsWith('android-app://'))).toBe(false)
  })

  it('garde les vraies sources externes (réseaux sociaux, recherche)', async () => {
    const [{ get_platform_stats: stats }] = (await db.query<{ get_platform_stats: { top_referrers: { referrer: string; visits: number }[] } }>(
      'select public.get_platform_stats()',
    )).rows
    const byReferrer = Object.fromEntries(stats.top_referrers.map((r) => [r.referrer, r.visits]))
    expect(byReferrer['https://www.instagram.com/']).toBe(2)
    expect(byReferrer['https://www.google.com/search?q=bitiko']).toBe(1)
    expect(byReferrer['https://www.facebook.com/']).toBe(1)
  })
})
