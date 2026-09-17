-- get_platform_stats() blended merchant back-office usage into every
-- visitor-facing metric: visits_today/7d/30d, the 14-day chart, and "top
-- pages" all counted /admin/* navigation the same as real storefront and
-- marketing-site traffic, and "top referrers" reported same-site navigation
-- (e.g. "https://bitiko.shop/admin/produits", a local dev
-- "http://localhost:5173/...", or the team clicking a deployment link on
-- vercel.com) as if it were an external source — drowning out real ones
-- like Google or Instagram. Standard analytics practice
-- (Plausible, Fathom, GA) is to exclude self-referrals from a "top
-- referrers" report entirely, and admin-panel clicks were never meant to be
-- "traffic" in the first place.
--
-- Client-side, SelfAnalytics.tsx now also stops recording /admin/*
-- (including /super-admin) page views going forward, and local dev never
-- records at all — this closes the same class of noise at the read layer
-- too, covering already-recorded historical rows without touching the
-- underlying data.

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
                                    select s.currency, sum(o.total) as total
                                    from public.orders o
                                    join public.shops s on s.id = o.shop_id
                                    where o.status <> 'cancelled'
                                    group by s.currency) t),
    'revenue_today_by_currency', (select coalesce(jsonb_agg(jsonb_build_object('currency', currency, 'total', total) order by total desc), '[]'::jsonb) from (
                                    select s.currency, sum(o.total) as total
                                    from public.orders o
                                    join public.shops s on s.id = o.shop_id
                                    where o.status <> 'cancelled' and o.created_at >= date_trunc('day', now())
                                    group by s.currency) t),
    'visits_today',    (select count(*) from public.page_views where created_at >= date_trunc('day', now()) and path !~ '^/(admin|super-admin)(/|$)'),
    'visitors_today',  (select count(distinct session_id) from public.page_views where created_at >= date_trunc('day', now()) and path !~ '^/(admin|super-admin)(/|$)'),
    'visits_7d',       (select count(*) from public.page_views where created_at >= now() - interval '7 days' and path !~ '^/(admin|super-admin)(/|$)'),
    'visitors_7d',     (select count(distinct session_id) from public.page_views where created_at >= now() - interval '7 days' and path !~ '^/(admin|super-admin)(/|$)'),
    'visits_30d',      (select count(*) from public.page_views where created_at >= now() - interval '30 days' and path !~ '^/(admin|super-admin)(/|$)'),
    'visitors_30d',    (select count(distinct session_id) from public.page_views where created_at >= now() - interval '30 days' and path !~ '^/(admin|super-admin)(/|$)'),
    'visits_by_day',   (select jsonb_agg(jsonb_build_object('day', d, 'visits', v, 'visitors', u) order by d) from (
                          select created_at::date as d,
                                 count(*) as v,
                                 count(distinct session_id) as u
                          from public.page_views
                          where created_at >= now() - interval '14 days'
                            and path !~ '^/(admin|super-admin)(/|$)'
                          group by created_at::date) t),
    'top_pages',       (select jsonb_agg(jsonb_build_object('shop', coalesce(s.slug, '(plateforme)'), 'path', p.path, 'visits', v) order by v desc) from (
                          select pv.shop_id, pv.path, count(*) as v
                          from public.page_views pv
                          where pv.created_at >= now() - interval '30 days'
                            and pv.path !~ '^/(admin|super-admin)(/|$)'
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
                            -- same-site navigation (any bitiko.shop host, or a local dev
                            -- server) isn't an external traffic source, and neither is the
                            -- Vercel dashboard/preview links the team clicks while deploying.
                            and referrer !~* '^https?://([a-z0-9-]+\.)?bitiko\.shop(/|$)'
                            and referrer !~* '^https?://localhost(:[0-9]+)?(/|$)'
                            and referrer !~* '^https?://([a-z0-9-]+\.)?vercel\.(com|app)(/|$)'
                          group by nullif(referrer, '')) t
                        limit 10)
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_platform_stats() from public, anon;
grant execute on function public.get_platform_stats() to authenticated;
