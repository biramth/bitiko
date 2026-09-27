-- 0137_onboarding_nudges.sql
--
-- Relance unique des comptes sans boutique : environ 24 h après l'inscription, un email
-- invite à terminer la création (le cron quotidien api/cron/automation-dispatch s'en charge).
--
--   * `onboarding_nudges` : une ligne par compte relancé (jamais deux fois). RLS activée sans
--     politique, accès refusé à anon/authenticated : seule la clé service_role y écrit.
--   * `get_onboarding_nudge_candidates()` : comptes confirmés, créés dans la fenêtre, sans boutique,
--     ni membre d'une équipe boutique ou plateforme, jamais relancés. Réservée à service_role.
--
-- Idempotent, re-jouable.

create table if not exists public.onboarding_nudges (
  user_id uuid primary key references auth.users(id) on delete cascade,
  kind text not null default 'no_shop_24h',
  sent_at timestamptz not null default now()
);

alter table public.onboarding_nudges enable row level security;
revoke all on public.onboarding_nudges from anon, authenticated;

create or replace function public.get_onboarding_nudge_candidates(
  p_min_age interval default interval '24 hours',
  p_max_age interval default interval '72 hours',
  p_limit integer default 50
)
returns table (user_id uuid, email text, full_name text, created_at timestamptz)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    u.id,
    u.email::text,
    coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
    u.created_at
  from auth.users u
  where u.email is not null
    and u.email_confirmed_at is not null
    and u.created_at <= now() - p_min_age
    and u.created_at > now() - p_max_age
    and not exists (select 1 from public.shops s where s.owner_id = u.id)
    and not exists (select 1 from public.shop_members sm where sm.user_id = u.id)
    and not exists (select 1 from public.platform_members pm where pm.user_id = u.id)
    and not exists (select 1 from public.onboarding_nudges n where n.user_id = u.id)
  order by u.created_at
  limit greatest(p_limit, 0);
$$;

revoke all on function public.get_onboarding_nudge_candidates(interval, interval, integer) from public, anon, authenticated;
grant execute on function public.get_onboarding_nudge_candidates(interval, interval, integer) to service_role;
