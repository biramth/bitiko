-- 0143_campaign_unsubscribes.sql
--
-- Chantier campagnes : aucun mécanisme de désabonnement n'existait pour les
-- emails de campagne (promo/annonce, à la discrétion de l'équipe — pas les
-- emails transactionnels bienvenue/abonnement activé/rappel, déclenchés par
-- l'action du destinataire lui-même, hors périmètre). Sans lien de
-- désabonnement fonctionnel, les gros clients mail (Gmail…) dégradent la
-- délivrabilité des envois en masse, et un commerçant qui ne veut plus
-- recevoir ces emails n'a aucun moyen simple de le signaler.
--
--   * `campaign_unsubscribes` : une ligne par compte désabonné (pas par
--     boutique — un même compte peut posséder plusieurs boutiques, une seule
--     adresse email les reçoit toutes). RLS activée sans politique, accès
--     refusé à anon/authenticated : seule la clé service_role y écrit
--     (le lien de désabonnement passe par un jeton signé côté serveur, pas
--     par une session utilisateur).
--   * `platform_audience()` exclut désormais les propriétaires désabonnés,
--     que la campagne les cible ou non — cohérent avec les compteurs déjà
--     affichés dans l'aperçu d'audience (previewCampaignAudience).
--
-- Idempotent, re-jouable.

create table if not exists public.campaign_unsubscribes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  unsubscribed_at timestamptz not null default now()
);

alter table public.campaign_unsubscribes enable row level security;
revoke all on public.campaign_unsubscribes from anon, authenticated;

create or replace function public.platform_audience(
  audience jsonb default '{}'::jsonb,
  viewer uuid default null
)
returns table (
  shop_id uuid,
  owner_id uuid,
  shop_name text,
  slug text,
  currency text,
  plan text
)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_plan text := coalesce(audience->>'plan', 'any');
  v_logo text := coalesce(audience->>'logo', 'any');
  v_products text := coalesce(audience->>'products', 'any');
  v_days integer := nullif(audience->>'created_within_days', '')::integer;
begin
  if not (
    (viewer is null and public.is_platform_admin())
    or
    (viewer is not null and exists (
      select 1 from public.platform_members m where m.user_id = viewer
    ))
  ) then
    raise exception 'Accès réservé.';
  end if;

  return query
    select
      s.id, s.owner_id, s.name, s.slug, s.currency,
      coalesce(sub.plan, 'free') as plan
    from public.shops s
    left join public.shop_subscriptions sub on sub.shop_id = s.id
    where
      not exists (select 1 from public.campaign_unsubscribes u where u.user_id = s.owner_id)
      and (v_plan = 'any'
        or (v_plan = 'paid' and coalesce(sub.plan, 'free') <> 'free' and coalesce(sub.status, 'none') = 'active')
        or (v_plan = 'free' and coalesce(sub.plan, 'free') = 'free')
        or (v_plan in ('essential', 'pro') and coalesce(sub.plan, 'free') = v_plan))
      and (v_logo = 'any'
        or (v_logo = 'has' and coalesce(s.logo_url, '') <> '')
        or (v_logo = 'none' and coalesce(s.logo_url, '') = ''))
      and (v_products = 'any'
        or (v_products = 'has' and exists (select 1 from public.products p where p.shop_id = s.id))
        or (v_products = 'none' and not exists (select 1 from public.products p where p.shop_id = s.id)))
      and (v_days is null or s.created_at >= now() - make_interval(days => v_days))
    order by s.created_at desc;
end;
$function$;
