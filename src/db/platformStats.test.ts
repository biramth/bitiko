import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

const MIGRATIONS = path.resolve(import.meta.dirname, '../../supabase/migrations')
const read = (name: string) => readFileSync(path.join(MIGRATIONS, name), 'utf8')

const OWNER = '00000000-0000-0000-0000-0000000000a1'
const SHOP = '00000000-0000-0000-0000-0000000000b1'
const SHOP2 = '00000000-0000-0000-0000-0000000000b2'
const VENDEUR = '00000000-0000-0000-0000-0000000000d1'

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
    create table public.shop_members (id uuid primary key default gen_random_uuid(), shop_id uuid not null references public.shops(id), email text not null, user_id uuid, role text not null default 'vendeur');
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

    insert into public.shops(id, owner_id, slug, name) values ('${SHOP}', '${OWNER}', 'chez-awa', 'Chez Awa');
    insert into public.shops(id, owner_id, slug, name) values ('${SHOP2}', '00000000-0000-0000-0000-0000000000a2', 'salon-fatou', 'Salon Fatou');
    insert into public.shop_members(shop_id, email, user_id, role) values ('${SHOP}', 'vendeur@example.sn', '${VENDEUR}', 'vendeur');
    insert into public.platform_members(user_id) values ('00000000-0000-0000-0000-0000000000c1');
    select set_config('app.uid', '00000000-0000-0000-0000-0000000000c1', false);
  `)
  await db.exec(read('0141_restore_referrer_noise_filter.sql'))
  await db.exec(read('0142_platform_stats_reliability.sql'))

  // Lignes « legacy » (ancien client) : URL complètes, user_id renseigné,
  // path avec query — la migration 0151 doit les anonymiser.
  const legacyView = (path: string, referrer: string | null, sessionId: string) =>
    `insert into public.page_views(path, session_id, referrer) values ('${path}', '${sessionId}', ${referrer ? `'${referrer}'` : 'null'});`
  await db.exec(`
    ${legacyView('/', 'https://accounts.google.com/o/oauth2/...', '00000000-0000-0000-0000-000000001001')}
    ${legacyView('/', 'https://myaccount.google.com/', '00000000-0000-0000-0000-000000001002')}
    ${legacyView('/', 'https://accounts.youtube.com/', '00000000-0000-0000-0000-000000001003')}
    ${legacyView('/', 'https://bitiko.shop/', '00000000-0000-0000-0000-000000001004')}
    ${legacyView('/', 'https://jannah-house.bitiko.shop/', '00000000-0000-0000-0000-000000001005')}
    ${legacyView('/', 'https://bitiko.shop/admin/login', '00000000-0000-0000-0000-000000001006')}
    ${legacyView('/', 'https://vercel.com/biramths-projects', '00000000-0000-0000-0000-000000001007')}
    ${legacyView('/', 'http://localhost:5173/', '00000000-0000-0000-0000-000000001008')}
    ${legacyView('/', 'android-app://com.google.android.gm/', '00000000-0000-0000-0000-000000001009')}
    ${legacyView('/', 'android-app://com.whatsapp/', '00000000-0000-0000-0000-000000001010')}
    ${legacyView('/', 'https://www.instagram.com/', '00000000-0000-0000-0000-000000002001')}
    ${legacyView('/', 'https://www.instagram.com/', '00000000-0000-0000-0000-000000002002')}
    ${legacyView('/', 'https://www.google.com/search?q=bitiko', '00000000-0000-0000-0000-000000002003')}
    ${legacyView('/', 'https://www.facebook.com/', '00000000-0000-0000-0000-000000002004')}
    ${legacyView('/produits?q=robe', null, '00000000-0000-0000-0000-000000002005')}
  `)
  // Ligne legacy avec user_id renseigné (ancien client) : doit être anonymisée.
  await db.exec(`
    insert into public.page_views(path, session_id, user_id) values ('/', '00000000-0000-0000-0000-000000001100', '${VENDEUR}');
  `)

  await db.exec(read('0151_page_views_cnil_exemption.sql'))

  // Lignes « nouveau client » : hôtes seuls, jamais de user_id.
  const view = (referrer: string | null, sessionId: string) =>
    `insert into public.page_views(path, session_id, referrer) values ('/', '${sessionId}', ${referrer ? `'${referrer}'` : 'null'});`
  await db.exec(`
    ${view('www.tiktok.com', '00000000-0000-0000-0000-000000002006')}
  `)

  // top_pages : une page « /admin/... » insérée directement (l'endpoint public n'impose
  // rien sur `path`), et de vraies pages boutique/plateforme.
  await db.exec(`
    insert into public.page_views(shop_id, path, session_id) values ('${SHOP}', '/produits/robe', '00000000-0000-0000-0000-000000003001');
    insert into public.page_views(shop_id, path, session_id) values ('${SHOP}', '/produits/robe', '00000000-0000-0000-0000-000000003002');
    insert into public.page_views(shop_id, path, session_id) values (null, '/', '00000000-0000-0000-0000-000000003003');
    insert into public.page_views(path, session_id) values ('/admin/produits', '00000000-0000-0000-0000-000000003004');
    insert into public.page_views(path, session_id) values ('/super-admin/shops', '00000000-0000-0000-0000-000000003005');
  `)

  // top_shops : depuis 0151, le client n'envoie plus de user_id et le serveur
  // ne distingue plus le personnel connecté — bruit accepté, tout compte.
  await db.exec(`
    insert into public.page_views(shop_id, path, session_id) values ('${SHOP}', '/', '00000000-0000-0000-0000-000000004001');
    insert into public.page_views(shop_id, path, session_id) values ('${SHOP}', '/', '00000000-0000-0000-0000-000000004002');
    insert into public.page_views(shop_id, path, session_id) values ('${SHOP2}', '/', '00000000-0000-0000-0000-000000004003');
    insert into public.page_views(shop_id, path, session_id) values ('${SHOP2}', '/', '00000000-0000-0000-0000-000000004004');
    insert into public.page_views(shop_id, path, session_id) values ('${SHOP2}', '/', '00000000-0000-0000-0000-000000004005');
  `)
}, 60_000)

describe('get_platform_stats().top_referrers (0151 — hôtes seuls)', () => {
  it('exclut les allers-retours OAuth, les liens internes et les lancements d’app natives', async () => {
    const [{ get_platform_stats: stats }] = (await db.query<{ get_platform_stats: { top_referrers: { referrer: string; visits: number }[] } }>(
      'select public.get_platform_stats()',
    )).rows
    const referrers = stats.top_referrers.map((r) => r.referrer)
    expect(referrers.some((r) => r.includes('accounts.google.com'))).toBe(false)
    expect(referrers.some((r) => r.includes('myaccount.google.com'))).toBe(false)
    expect(referrers.some((r) => r.includes('accounts.youtube.com'))).toBe(false)
    expect(referrers.some((r) => r.includes('bitiko.shop'))).toBe(false)
    expect(referrers.some((r) => r.includes('vercel.com'))).toBe(false)
    expect(referrers.some((r) => r.includes('localhost'))).toBe(false)
    expect(referrers.some((r) => r.includes('android-app'))).toBe(false)
  })

  it('garde les vraies sources externes sous forme d’hôtes (legacy anonymisés + nouveau client)', async () => {
    const [{ get_platform_stats: stats }] = (await db.query<{ get_platform_stats: { top_referrers: { referrer: string; visits: number }[] } }>(
      'select public.get_platform_stats()',
    )).rows
    const byReferrer = Object.fromEntries(stats.top_referrers.map((r) => [r.referrer, r.visits]))
    expect(byReferrer['www.instagram.com']).toBe(2)
    expect(byReferrer['www.google.com']).toBe(1)
    expect(byReferrer['www.facebook.com']).toBe(1)
    expect(byReferrer['www.tiktok.com']).toBe(1)
  })
})

describe('0151 — anonymisation de l’historique', () => {
  it('plus aucun user_id, referrer réduit à l’hôte, path sans query', async () => {
    const [{ count: userIds }] = (await db.query<{ count: string }>(
      "select count(*)::text as count from public.page_views where user_id is not null",
    )).rows
    expect(userIds).toBe('0')
    const [{ count: dirtyReferrers }] = (await db.query<{ count: string }>(
      "select count(*)::text as count from public.page_views where referrer is not null and referrer <> '' and referrer ~ '[/:?]';",
    )).rows
    expect(dirtyReferrers).toBe('0')
    const [{ count: dirtyPaths }] = (await db.query<{ count: string }>(
      "select count(*)::text as count from public.page_views where path ~ '[?#]';",
    )).rows
    expect(dirtyPaths).toBe('0')
  })
})

describe('get_platform_stats().top_pages (0142)', () => {
  it('exclut /admin et /super-admin, garde les pages boutique et plateforme', async () => {
    const [{ get_platform_stats: stats }] = (await db.query<{
      get_platform_stats: { top_pages: { shop: string; path: string; visits: number }[] }
    }>('select public.get_platform_stats()')).rows
    const paths = stats.top_pages.map((p) => p.path)
    expect(paths).not.toContain('/admin/produits')
    expect(paths).not.toContain('/super-admin/shops')
    const produit = stats.top_pages.find((p) => p.path === '/produits/robe')
    expect(produit).toEqual({ shop: 'chez-awa', path: '/produits/robe', visits: 2 })
    expect(stats.top_pages.find((p) => p.path === '/' && p.shop === '(plateforme)')).toBeTruthy()
  })
})

describe('get_platform_stats().top_shops (0151 — bruit interne accepté)', () => {
  it('compte toutes les sessions, y compris celles du personnel connecté', async () => {
    const [{ get_platform_stats: stats }] = (await db.query<{
      get_platform_stats: { top_shops: { slug: string; name: string; visits: number }[] }
    }>('select public.get_platform_stats()')).rows
    const bySlug = Object.fromEntries(stats.top_shops.map((s) => [s.slug, s.visits]))
    // chez-awa cumule les 2 sessions de la section top_pages (même boutique),
    // le vendeur connecté et 1 vrai client de cette section.
    expect(bySlug['chez-awa']).toBe(4)
    expect(bySlug['salon-fatou']).toBe(3)
  })
})
