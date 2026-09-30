-- 0153_pricing_consent_retention.sql
--
-- Lot A conformité :
--  1. Affichage fiscal par boutique : `shops.tax_display` ('net' par défaut —
--     prix affichés tels quels, ou 'ttc' — prix affichés + suffixe TTC).
--     Aucun calcul de taxe (montants entiers, totaux = prix affichés).
--  2. Opt-in marketing : `profiles.marketing_opt_in` (défaut false) ;
--     `platform_audience()` n'inclut plus que les propriétaires opt-in
--     (cumulé avec l'exclusion des désinscrits existante).
--  3. Durées de conservation : purge immédiate + pg_cron hebdomadaire pour
--     `admin_audit_log` (> 3 ans), `campaigns`/`campaign_sends` (> 3 ans) et
--     `push_subscriptions` inactives (> 13 mois).
--
-- Idempotent, re-jouable.

-- ---------------------------------------------------------------------------
-- 1. Statut fiscal d'affichage par boutique.
-- ---------------------------------------------------------------------------
alter table public.shops
  add column if not exists tax_display text not null default 'net';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'shops_tax_display_check'
  ) then
    alter table public.shops
      add constraint shops_tax_display_check check (tax_display in ('net', 'ttc'));
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 2. Opt-in marketing + filtre d'audience.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists marketing_opt_in boolean not null default false;

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
      and exists (select 1 from public.profiles p where p.id = s.owner_id and p.marketing_opt_in is true)
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

-- ---------------------------------------------------------------------------
-- 3. Purges : audit 3 ans, campagnes 3 ans, push inactives 13 mois.
-- ---------------------------------------------------------------------------
delete from public.admin_audit_log where created_at < now() - interval '3 years';
delete from public.campaign_sends where created_at < now() - interval '3 years';
delete from public.campaigns where created_at < now() - interval '3 years';
delete from public.push_subscriptions where last_seen_at < now() - interval '13 months';

create or replace function public.purge_old_compliance_rows()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted bigint := 0;
  v_rows bigint;
begin
  delete from public.admin_audit_log where created_at < now() - interval '3 years';
  get diagnostics v_rows = row_count;
  v_deleted := v_deleted + v_rows;
  delete from public.campaign_sends where created_at < now() - interval '3 years';
  get diagnostics v_rows = row_count;
  v_deleted := v_deleted + v_rows;
  delete from public.campaigns where created_at < now() - interval '3 years';
  get diagnostics v_rows = row_count;
  v_deleted := v_deleted + v_rows;
  delete from public.push_subscriptions where last_seen_at < now() - interval '13 months';
  get diagnostics v_rows = row_count;
  v_deleted := v_deleted + v_rows;
  return v_deleted;
end;
$$;

revoke all on function public.purge_old_compliance_rows() from public, anon, authenticated;

-- Planifié seulement là où pg_cron existe (absent des bases de test locales).
do $cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('purge-old-compliance-rows', '0 3 * * 0', $$select public.purge_old_compliance_rows()$$);
  end if;
end
$cron$;
