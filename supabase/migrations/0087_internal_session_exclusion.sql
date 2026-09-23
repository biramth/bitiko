-- ---------------------------------------------------------------------------
-- Visit-counting rework: exclude internal (platform-operator) traffic and
-- count one unique visitor per session per day — a session that returns to the
-- same shop the same day is not re-counted. Applies to both surfaces:
--   platform_stats (0058/0042 family) and per-shop stats (get_shop_visit_stats).
--
-- Mechanism: page_views gains a nullable user_id. When a logged-in visitor
-- records a view, RLS forces user_id to be their own uid (or NULL for anon).
-- A row whose user_id belongs to a shop owner or to a platform_members member
-- is treated as internal and excluded from every counter; we also dedupe by
-- session_id so "visits" and "visitors" both mean one unique session per day.
-- ---------------------------------------------------------------------------

alter table public.page_views add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists page_views_user_id_idx on public.page_views (user_id);
create index if not exists page_views_shop_session_day_idx on public.page_views (shop_id, created_at, session_id);

-- RLS can no longer keep the loose "record anything" door while letting a
-- client spoof someone else's user_id to dodge the counters: an anonymous
-- visitor can only insert user_id = NULL; an authenticated one can only use
-- their own uid.
drop policy if exists "page_views: anyone can record" on public.page_views;
create policy "page_views: record own or anonymous view"
  on public.page_views
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Helper: is this user part of the platform's own staff (and thus their views
-- are "internal")? True for any shop owner and any platform_members member.
-- ---------------------------------------------------------------------------
create or replace function public.is_internal_user(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.shops s where s.owner_id = p_uid
  )
  or exists (
    select 1 from public.platform_members m where m.user_id = p_uid
  );
$$;

revoke all on function public.is_internal_user(uuid) from public, anon;
grant execute on function public.is_internal_user(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Platform-wide stats. "visits" and "visitors" are both distinct sessions
-- (one unique visitor per day), internal sessions excluded everywhere.
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
    'visits_today',    (select count(distinct session_id) from public.page_views
                        where created_at >= date_trunc('day', now())
                          and path !~ '^/(admin|super-admin)(/|$)'
                          and (user_id is null or not public.is_internal_user(user_id))),
    'visitors_today',  (select count(distinct session_id) from public.page_views
                        where created_at >= date_trunc('day', now())
                          and path !~ '^/(admin|super-admin)(/|$)'
                          and (user_id is null or not public.is_internal_user(user_id))),
    'visits_7d',       (select count(distinct session_id) from public.page_views
                        where created_at >= now() - interval '7 days'
                          and path !~ '^/(admin|super-admin)(/|$)'
                          and (user_id is null or not public.is_internal_user(user_id))),
    'visitors_7d',     (select count(distinct session_id) from public.page_views
                        where created_at >= now() - interval '7 days'
                          and path !~ '^/(admin|super-admin)(/|$)'
                          and (user_id is null or not public.is_internal_user(user_id))),
    'visits_30d',      (select count(distinct session_id) from public.page_views
                        where created_at >= now() - interval '30 days'
                          and path !~ '^/(admin|super-admin)(/|$)'
                          and (user_id is null or not public.is_internal_user(user_id))),
    'visitors_30d',    (select count(distinct session_id) from public.page_views
                        where created_at >= now() - interval '30 days'
                          and path !~ '^/(admin|super-admin)(/|$)'
                          and (user_id is null or not public.is_internal_user(user_id))),
    'visits_by_day',   (select coalesce(jsonb_agg(jsonb_build_object('day', t.d, 'visits', t.v, 'visitors', t.u) order by t.d), '[]'::jsonb) from (
                          select created_at::date as d,
                                 count(distinct session_id) as v,
                                 count(distinct session_id) as u
                          from public.page_views
                          where created_at >= now() - interval '14 days'
                            and path !~ '^/(admin|super-admin)(/|$)'
                            and (user_id is null or not public.is_internal_user(user_id))
                          group by created_at::date) t),
    'top_pages',       (select coalesce(jsonb_agg(jsonb_build_object('shop', coalesce(s.slug, '(plateforme)'), 'path', p.path, 'visits', p.v) order by p.v desc), '[]'::jsonb) from (
                          select pv.shop_id, pv.path, count(distinct pv.session_id) as v
                          from public.page_views pv
                          where pv.created_at >= now() - interval '30 days'
                            and (pv.user_id is null or not public.is_internal_user(pv.user_id))
                          group by pv.shop_id, pv.path
                          order by v desc
                          limit 15
                        ) p
                        left join public.shops s on s.id = p.shop_id),
    'top_shops',       (select coalesce(jsonb_agg(jsonb_build_object('slug', s.slug, 'name', s.name, 'visits', t.v) order by t.v desc), '[]'::jsonb) from (
                          select pv.shop_id, count(distinct pv.session_id) as v
                          from public.page_views pv
                          where pv.created_at >= now() - interval '30 days' and pv.shop_id is not null
                            and (pv.user_id is null or not public.is_internal_user(pv.user_id))
                          group by pv.shop_id
                          order by v desc
                          limit 15
                        ) t
                        join public.shops s on s.id = t.shop_id),
    'top_referrers',   (select coalesce(jsonb_agg(jsonb_build_object('referrer', t.r, 'visits', t.v) order by t.v desc), '[]'::jsonb) from (
                          select nullif(referrer, '') as r, count(distinct session_id) as v
                          from public.page_views
                          where created_at >= now() - interval '30 days'
                            and referrer is not null and referrer <> ''
                            and (user_id is null or not public.is_internal_user(user_id))
                          group by nullif(referrer, '')
                          order by v desc
                          limit 10
                        ) t)
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_platform_stats() from public, anon;
grant execute on function public.get_platform_stats() to authenticated;

-- ---------------------------------------------------------------------------
-- Per-shop stats (merchant dashboard). Same rule: one unique session per day,
-- internal sessions (the shop's owner themselves or any platform member) out.
-- ---------------------------------------------------------------------------
create or replace function public.get_shop_visit_stats(p_shop_id uuid)
returns table (
  visits_today bigint,
  visits_30d bigint,
  visitors_30d bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(distinct pv.session_id)
       from public.page_views pv
      where pv.shop_id = p_shop_id
        and pv.created_at >= date_trunc('day', now())
        and (pv.user_id is null or not public.is_internal_user(pv.user_id))) as visits_today,
    (select count(distinct pv.session_id)
       from public.page_views pv
      where pv.shop_id = p_shop_id
        and pv.created_at >= now() - interval '30 days'
        and (pv.user_id is null or not public.is_internal_user(pv.user_id))) as visits_30d,
    (select count(distinct pv.session_id)
       from public.page_views pv
      where pv.shop_id = p_shop_id
        and pv.created_at >= now() - interval '30 days'
        and (pv.user_id is null or not public.is_internal_user(pv.user_id))) as visitors_30d;
$$;

revoke all on function public.get_shop_visit_stats(uuid) from public, anon;
grant execute on function public.get_shop_visit_stats(uuid) to authenticated;