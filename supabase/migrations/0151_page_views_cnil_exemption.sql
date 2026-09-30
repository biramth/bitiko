-- 0151_page_views_cnil_exemption.sql
--
-- Mise en conformité CNIL de la mesure d'audience interne (exemption de
-- consentement, art. 82 loi Informatique et Libertés) :
--  1. Anonymisation de l'historique : user_id -> NULL (plus de recoupement
--     avec les comptes), referrer -> hôte seul, path -> sans query ni ancre.
--  2. RLS : seules les lignes anonymes (user_id IS NULL) sont inscriptibles.
--  3. RPC réécrites sans référence à user_id : l'exclusion du trafic interne
--     par compte n'existe plus (bruit accepté) ; top_referrers filtre des
--     hôtes (nouveau format stocké) au lieu d'URL complètes.
--  4. Conservation 13 mois : purge immédiate + pg_cron hebdomadaire.
--
-- Idempotent, re-jouable.

-- ---------------------------------------------------------------------------
-- 1. Anonymisation de l'historique.
-- ---------------------------------------------------------------------------
update public.page_views set user_id = null where user_id is not null;

update public.page_views
   set referrer = split_part(split_part(regexp_replace(nullif(referrer, ''), '^https?://', ''), '/', 1), ':', 1)
 where referrer is not null and referrer <> '';

update public.page_views
   set path = regexp_replace(path, '[?#].*$', '')
 where path ~ '[?#]';

-- ---------------------------------------------------------------------------
-- 2. RLS : insertion anonyme uniquement.
-- ---------------------------------------------------------------------------
drop policy if exists "page_views: record own or anonymous view" on public.page_views;
create policy "page_views: record anonymous view"
  on public.page_views
  for insert to anon, authenticated
  with check (user_id is null);

-- ---------------------------------------------------------------------------
-- 3. Stats plateforme : mêmes sorties, sans filtre par compte.
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
                          and path !~ '^/(admin|super-admin)(/|$)'),
    'visitors_today',  (select count(distinct session_id) from public.page_views
                        where created_at >= date_trunc('day', now())
                          and path !~ '^/(admin|super-admin)(/|$)'),
    'visits_7d',       (select count(distinct session_id) from public.page_views
                        where created_at >= now() - interval '7 days'
                          and path !~ '^/(admin|super-admin)(/|$)'),
    'visitors_7d',     (select count(distinct session_id) from public.page_views
                        where created_at >= now() - interval '7 days'
                          and path !~ '^/(admin|super-admin)(/|$)'),
    'visits_30d',      (select count(distinct session_id) from public.page_views
                        where created_at >= now() - interval '30 days'
                          and path !~ '^/(admin|super-admin)(/|$)'),
    'visitors_30d',    (select count(distinct session_id) from public.page_views
                        where created_at >= now() - interval '30 days'
                          and path !~ '^/(admin|super-admin)(/|$)'),
    'visits_by_day',   (select coalesce(jsonb_agg(jsonb_build_object('day', t.d, 'visits', t.v, 'visitors', t.u) order by t.d), '[]'::jsonb) from (
                          select created_at::date as d,
                                 count(distinct session_id) as v,
                                 count(distinct session_id) as u
                          from public.page_views
                          where created_at >= now() - interval '14 days'
                            and path !~ '^/(admin|super-admin)(/|$)'
                          group by created_at::date) t),
    'top_pages',       (select coalesce(jsonb_agg(jsonb_build_object('shop', coalesce(s.slug, '(plateforme)'), 'path', p.path, 'visits', p.v) order by p.v desc), '[]'::jsonb) from (
                          select pv.shop_id, pv.path, count(distinct pv.session_id) as v
                          from public.page_views pv
                          where pv.created_at >= now() - interval '30 days'
                            and pv.path !~ '^/(admin|super-admin)(/|$)'
                          group by pv.shop_id, pv.path
                          order by v desc
                          limit 15
                        ) p
                        left join public.shops s on s.id = p.shop_id),
    'top_shops',       (select coalesce(jsonb_agg(jsonb_build_object('slug', s.slug, 'name', s.name, 'visits', t.v) order by t.v desc), '[]'::jsonb) from (
                          select pv.shop_id, count(distinct pv.session_id) as v
                          from public.page_views pv
                          where pv.created_at >= now() - interval '30 days' and pv.shop_id is not null
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
                            and referrer !~* '^([a-z0-9-]+\.)?bitiko\.shop$'
                            and referrer !~* '^localhost$'
                            and referrer !~* '^([a-z0-9-]+\.)?vercel\.(com|app)$'
                            and referrer !~* '^(accounts|myaccount)\.google\.com$'
                            and referrer !~* '^accounts\.youtube\.com$'
                            and referrer !~* '^android-app'
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
-- Stats boutique : mêmes sorties, sans filtre par compte.
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
        and pv.created_at >= date_trunc('day', now())) as visits_today,
    (select count(distinct pv.session_id)
       from public.page_views pv
      where pv.shop_id = p_shop_id
        and pv.created_at >= now() - interval '30 days') as visits_30d,
    (select count(distinct pv.session_id)
       from public.page_views pv
      where pv.shop_id = p_shop_id
        and pv.created_at >= now() - interval '30 days') as visitors_30d;
$$;

revoke all on function public.get_shop_visit_stats(uuid) from public, anon;
grant execute on function public.get_shop_visit_stats(uuid) to authenticated;

-- Plus aucune référence : la fonction d'exclusion par compte est supprimée
-- (les définitions 0066/0087/0141/0142 restent dans l'historique, inertes).
drop function if exists public.is_internal_user(uuid);

-- ---------------------------------------------------------------------------
-- 4. Conservation 13 mois : purge immédiate + hebdomadaire (pg_cron).
-- ---------------------------------------------------------------------------
delete from public.page_views where created_at < now() - interval '13 months';

create or replace function public.purge_old_page_views()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted bigint;
begin
  delete from public.page_views where created_at < now() - interval '13 months';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.purge_old_page_views() from public, anon, authenticated;

-- Planifié seulement là où pg_cron existe (absent des bases de test locales).
do $cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('purge-old-page-views', '0 3 * * 0', $$select public.purge_old_page_views()$$);
  end if;
end
$cron$;
