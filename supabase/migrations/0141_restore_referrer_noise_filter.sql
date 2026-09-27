-- 0141_restore_referrer_noise_filter.sql
--
-- Régression : 0066 (filter_noise_from_top_referrers) excluait déjà les allers-retours
-- OAuth (accounts.google.com…), les liens internes (bitiko.shop, localhost, vercel.*) et
-- les lancements d'applications natives (android-app://) des « Sources de trafic ». Mais
-- 0087 (internal_session_exclusion), postérieure, a redéfini get_platform_stats() pour
-- une raison différente (exclusion des sessions internes, une visite par session/jour) et
-- a écrasé ce filtrage sans le reprendre — malgré le commentaire de 0066 affirmant l'avoir
-- fusionné dans la version de 0087, jamais fait dans le corps réel de la fonction.
-- Résultat en prod : accounts.google.com en tête des sources de trafic (37 visites lors
-- de la vérification), suivi de bitiko.shop, bitiko.shop/admin/login, vercel.com et
-- android-app://com.google.android.gm — aucun n'est une vraie source externe.
--
-- Corps identique à 0087 (comptage par session/jour, sessions internes exclues partout),
-- avec le bloc top_referrers de 0066 restauré. Rien d'autre ne change ; les lignes déjà
-- enregistrées dans page_views ne sont pas modifiées, seul l'agrégat lu est corrigé.

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
                            -- une navigation interne (n'importe quel hôte bitiko.shop, ou un
                            -- serveur de dev local) n'est pas une source externe, pas plus que
                            -- le dashboard/les liens de preview Vercel ouverts lors des déploiements.
                            and referrer !~* '^https?://([a-z0-9-]+\.)?bitiko\.shop(/|$)'
                            and referrer !~* '^https?://localhost(:[0-9]+)?(/|$)'
                            and referrer !~* '^https?://([a-z0-9-]+\.)?vercel\.(com|app)(/|$)'
                            -- les pages de connexion Google sont l'aller-retour OAuth de chaque
                            -- login, pas des pages d'où le visiteur navigue.
                            and referrer !~* '^https?://(accounts|myaccount)\.google\.com(/|$)'
                            and referrer !~* '^https?://accounts\.youtube\.com(/|$)'
                            -- un lancement d'application native (ex. l'app Gmail) n'est pas non
                            -- plus un referrer de site web.
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
