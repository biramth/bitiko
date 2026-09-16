-- ---------------------------------------------------------------------------
-- Self-hosted analytics + platform-operator RPCs.
--
-- The storefront and the platform site record page views into `page_views`
-- with the public anon/authenticated key (appended, never erased by clients).
-- Merchant owners read only their own shop's traffic (RLS); all platform-wide
-- aggregates leave the DB exclusively through the SECURITY DEFINER
-- get_platform_* RPCs below, which refuse anyone outside the operator
-- allowlist. This is the "nos propres analytics" counterpart to the optional
-- Vercel Web Analytics and the merchant-facing GA4 (which stays a paid plan
-- feature for merchants who want their own property).
-- ---------------------------------------------------------------------------

create table public.page_views (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references public.shops(id) on delete cascade,
  path text not null,
  session_id uuid not null,
  referrer text,
  device text check (device in ('mobile', 'tablet', 'desktop')),
  created_at timestamptz not null default now()
);

create index page_views_created_idx on public.page_views (created_at desc);
create index page_views_shop_created_idx on public.page_views (shop_id, created_at desc);
create index page_views_session_idx on public.page_views (session_id);

alter table public.page_views enable row level security;

-- Anyone (visitor or merchant) can record a page view; nothing is readable
-- via the Data API without a policy.
create policy "page_views: anyone can record" on public.page_views
  for insert to anon, authenticated with check (true);

-- A merchant reads only the traffic of the shop they own.
create policy "page_views: shop owner reads own" on public.page_views
  for select to authenticated
  using (
    shop_id is not null
    and exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Platform-operator gate. Keep this email list in sync with the
-- PLATFORM_ADMIN_EMAILS allowlist in api/_lib/supabaseAdmin.ts.
-- ---------------------------------------------------------------------------
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = (select auth.uid())
      and u.email in ('papebiramethiombanee@gmail.com')
  );
$$;

revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Platform-wide stats (one JSON document, computed with a few indexed scans).
-- Revenue is reported per currency — summing totals across shops that bill in
-- different currencies would be meaningless.
-- ---------------------------------------------------------------------------
create or replace function public.get_platform_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Accès réservé.';
  end if;

  select jsonb_build_object(
    'total_shops',     (select count(*) from public.shops),
    'paid_shops',      (select count(*) from public.shop_subscriptions where plan <> 'free' and status = 'active'),
    'total_products',  (select count(*) from public.products),
    'active_products', (select count(*) from public.products where active),
    'total_orders',    (select count(*) from public.orders),
    'orders_today',    (select count(*) from public.orders where created_at >= date_trunc('day', now())),
    'revenue_by_currency',       (select coalesce(jsonb_agg(jsonb_build_object('currency', currency, 'total', total) order by total desc), '[]'::jsonb) from (
                                    select currency, sum(total) as total
                                    from public.orders where status <> 'cancelled'
                                    group by currency) t),
    'revenue_today_by_currency', (select coalesce(jsonb_agg(jsonb_build_object('currency', currency, 'total', total) order by total desc), '[]'::jsonb) from (
                                    select currency, sum(total) as total
                                    from public.orders
                                    where status <> 'cancelled' and created_at >= date_trunc('day', now())
                                    group by currency) t),
    'visits_today',    (select count(*) from public.page_views where created_at >= date_trunc('day', now())),
    'visitors_today',  (select count(distinct session_id) from public.page_views where created_at >= date_trunc('day', now())),
    'visits_7d',       (select count(*) from public.page_views where created_at >= now() - interval '7 days'),
    'visitors_7d',     (select count(distinct session_id) from public.page_views where created_at >= now() - interval '7 days'),
    'visits_30d',      (select count(*) from public.page_views where created_at >= now() - interval '30 days'),
    'visitors_30d',    (select count(distinct session_id) from public.page_views where created_at >= now() - interval '30 days'),
    'visits_by_day',   (select jsonb_agg(jsonb_build_object('day', d, 'visits', v, 'visitors', u) order by d) from (
                          select created_at::date as d,
                                 count(*) as v,
                                 count(distinct session_id) as u
                          from public.page_views
                          where created_at >= now() - interval '14 days'
                          group by created_at::date) t),
    'top_pages',       (select jsonb_agg(jsonb_build_object('shop', coalesce(s.slug, '(plateforme)'), 'path', p.path, 'visits', v) order by v desc) from (
                          select pv.shop_id, pv.path, count(*) as v
                          from public.page_views pv
                          where pv.created_at >= now() - interval '30 days'
                          group by pv.shop_id, pv.path) p
                        left join public.shops s on s.id = p.shop_id
                        limit 15),
    'top_shops',       (select jsonb_agg(jsonb_build_object('slug', s.slug, 'name', s.name, 'visits', v) order by v desc) from (
                          select pv.shop_id, count(*) as v
                          from public.page_views pv
                          where pv.created_at >= now() - interval '30 days' and pv.shop_id is not null
                          group by pv.shop_id) t
                        join public.shops s on s.id = t.shop_id
                        limit 15),
    'top_referrers',   (select jsonb_agg(jsonb_build_object('referrer', r, 'visits', v) order by v desc) from (
                          select nullif(referrer, '') as r, count(*) as v
                          from public.page_views
                          where created_at >= now() - interval '30 days'
                            and referrer is not null and referrer <> ''
                          group by nullif(referrer, '')) t
                        limit 10)
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_platform_stats() from public, anon;
grant execute on function public.get_platform_stats() to authenticated;

-- ---------------------------------------------------------------------------
-- Every shop with its live counters (products/orders/revenue) and plan.
-- ---------------------------------------------------------------------------
create or replace function public.get_platform_shops()
returns table (
  id uuid,
  name text,
  slug text,
  whatsapp_number text,
  currency text,
  created_at timestamptz,
  products bigint,
  orders bigint,
  revenue numeric,
  plan text,
  plan_status text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Accès réservé.';
  end if;

  return query
    select
      s.id, s.name, s.slug, s.whatsapp_number, s.currency, s.created_at,
      (select count(*) from public.products p where p.shop_id = s.id) as products,
      (select count(*) from public.orders o where o.shop_id = s.id) as orders,
      (select coalesce(sum(o.total), 0) from public.orders o where o.shop_id = s.id and o.status <> 'cancelled') as revenue,
      coalesce(sub.plan, 'free') as plan,
      coalesce(sub.status, 'none') as plan_status
    from public.shops s
    left join public.shop_subscriptions sub on sub.shop_id = s.id
    order by s.created_at desc;
end;
$$;

revoke all on function public.get_platform_shops() from public, anon;
grant execute on function public.get_platform_shops() to authenticated;

-- ---------------------------------------------------------------------------
-- Platform-wide recent orders (operator view).
-- ---------------------------------------------------------------------------
create or replace function public.get_platform_orders(p_limit integer default 20)
returns table (
  id uuid,
  order_number text,
  shop_id uuid,
  shop_name text,
  shop_slug text,
  customer_name text,
  customer_phone text,
  total numeric,
  status text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Accès réservé.';
  end if;

  return query
    select
      o.id, o.order_number, o.shop_id, s.name, s.slug,
      o.customer_name, o.customer_phone, o.total, o.status, o.created_at
    from public.orders o
    join public.shops s on s.id = o.shop_id
    order by o.created_at desc
    limit greatest(1, least(coalesce(p_limit, 20), 100));
end;
$$;

revoke all on function public.get_platform_orders(integer) from public, anon;
grant execute on function public.get_platform_orders(integer) to authenticated;
