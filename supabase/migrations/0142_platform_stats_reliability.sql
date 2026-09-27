-- 0142_platform_stats_reliability.sql
--
-- Deux lacunes trouvées en vérifiant top_pages/top_shops après la correction du
-- bruit sur top_referrers (0141) :
--
-- 1. is_internal_user() ne couvrait que le propriétaire de boutique et l'équipe
--    plateforme — pas un manager/vendeur (public.shop_members, 0093). Un membre
--    d'équipe connecté qui consulte sa propre vitrine (vérifier un prix, tester
--    une commande…) comptait donc comme un vrai visiteur, gonflant les chiffres
--    de sa propre boutique dans top_shops/visits/visitors.
--
-- 2. top_pages n'appliquait pas le filtre `path !~ '^/(admin|super-admin)(/|$)'`
--    déjà présent sur visits_today/visits_7d/visits_30d/visits_by_day. Le client
--    (SelfAnalytics) n'enregistre déjà rien sous /admin ni /plateforme, donc ce
--    n'est pas la cause d'un biais observé — mais l'endpoint d'insertion (clé
--    anon, policy ouverte à quiconque) ne contraint pas la valeur de `path` :
--    filtre de défense en profondeur, cohérent avec le reste de la fonction.
--
-- Idempotent, re-jouable.

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
  )
  or exists (
    select 1 from public.shop_members sm where sm.user_id = p_uid
  );
$$;

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
                            and pv.path !~ '^/(admin|super-admin)(/|$)'
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
                            and referrer !~* '^https?://([a-z0-9-]+\.)?bitiko\.shop(/|$)'
                            and referrer !~* '^https?://localhost(:[0-9]+)?(/|$)'
                            and referrer !~* '^https?://([a-z0-9-]+\.)?vercel\.(com|app)(/|$)'
                            and referrer !~* '^https?://(accounts|myaccount)\.google\.com(/|$)'
                            and referrer !~* '^https?://accounts\.youtube\.com(/|$)'
                            and referrer !~* '^android-app://'
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
