-- get_platform_stats() from 0033 summed order totals across every currency,
-- which is meaningless if one shop bills in XOF and another in EUR/USD.
-- Report revenue grouped by currency instead. (0033's file is written in its
-- final, currency-aware form too; this migration brings already-migrated
-- databases — including production — in line.)
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