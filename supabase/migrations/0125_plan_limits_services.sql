-- 0125 : plafonds de plan pour les métiers de service.
--
-- Jusqu'ici seuls les produits étaient plafonnés : un salon (prestations,
-- équipe, rendez-vous) n'avait aucun levier payant. Trois limites, lues dans
-- `plan_limits` (source unique, modifiables sans déploiement) :
--   MAX_ACTIVE_SERVICES     prestations actives      free 6  · essential 30 · pro illimité
--   MAX_TEAM_MEMBERS        équipiers actifs (vitrine) free 2 · essential 8  · pro illimité
--   MAX_MONTHLY_BOOKINGS    demandes en ligne / mois  free 40 · essential 300 · pro illimité
-- Les valeurs sont une PROPOSITION de départ (à valider côté produit) : on les
-- ajuste par UPDATE de `plan_limits`, sans migration.
-- Le plafond de réservations ne s'applique qu'aux demandes invitées : le
-- personnel peut toujours saisir un rendez-vous à la main.
-- Idempotent, re-exécutable.

insert into public.plan_limits (plan_key, code, max_value) values
  ('free', 'MAX_ACTIVE_SERVICES', 6),
  ('essential', 'MAX_ACTIVE_SERVICES', 30),
  ('pro', 'MAX_ACTIVE_SERVICES', null),
  ('free', 'MAX_TEAM_MEMBERS', 2),
  ('essential', 'MAX_TEAM_MEMBERS', 8),
  ('pro', 'MAX_TEAM_MEMBERS', null),
  ('free', 'MAX_MONTHLY_BOOKINGS', 40),
  ('essential', 'MAX_MONTHLY_BOOKINGS', 300),
  ('pro', 'MAX_MONTHLY_BOOKINGS', null)
on conflict do nothing;

-- Lecteur générique (NULL = illimité, y compris code absent).
create or replace function public.plan_limit(p_plan text, p_code text)
returns integer
language sql
stable
set search_path = public
as $$
  select max_value from public.plan_limits where plan_key = p_plan and code = p_code;
$$;

revoke all on function public.plan_limit(text, text) from public, anon, authenticated;

-- ── Prestations actives ───────────────────────────────────────────────────

create or replace function public.enforce_service_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max integer;
  v_count integer;
begin
  if not new.active then
    return new;
  end if;
  -- Modifier une ligne déjà active (prix, nom…) ne doit jamais être bloqué,
  -- même si la boutique dépasse un plafond introduit après coup.
  if tg_op = 'UPDATE' and old.active and old.shop_id = new.shop_id then
    return new;
  end if;
  v_max := public.plan_limit(public.effective_plan_key(new.shop_id), 'MAX_ACTIVE_SERVICES');
  if v_max is null then
    return new;
  end if;
  select count(*) into v_count
  from public.services
  where shop_id = new.shop_id and active = true and id <> new.id;
  if v_count >= v_max then
    raise exception 'plan_limit_exceeded: le plan actuel autorise au maximum % prestations actives', v_max
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_service_limit() from public, anon, authenticated;

drop trigger if exists services_enforce_plan_limit on public.services;
create trigger services_enforce_plan_limit
  before insert or update of active, shop_id on public.services
  for each row execute function public.enforce_service_limit();

-- ── Équipiers actifs (vitrine) ────────────────────────────────────────────

create or replace function public.enforce_team_member_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max integer;
  v_count integer;
begin
  if not new.active then
    return new;
  end if;
  -- Modifier une ligne déjà active (prix, nom…) ne doit jamais être bloqué,
  -- même si la boutique dépasse un plafond introduit après coup.
  if tg_op = 'UPDATE' and old.active and old.shop_id = new.shop_id then
    return new;
  end if;
  v_max := public.plan_limit(public.effective_plan_key(new.shop_id), 'MAX_TEAM_MEMBERS');
  if v_max is null then
    return new;
  end if;
  select count(*) into v_count
  from public.team_members
  where shop_id = new.shop_id and active = true and id <> new.id;
  if v_count >= v_max then
    raise exception 'plan_limit_exceeded: le plan actuel autorise au maximum % équipiers actifs', v_max
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_team_member_limit() from public, anon, authenticated;

drop trigger if exists team_members_enforce_plan_limit on public.team_members;
create trigger team_members_enforce_plan_limit
  before insert or update of active, shop_id on public.team_members
  for each row execute function public.enforce_team_member_limit();

-- ── Demandes en ligne / mois (invités uniquement) ─────────────────────────
-- Étend le garde-fou anti-abus (0122), déjà appelé uniquement pour les invités.

create or replace function public.assert_booking_not_abusive(p_shop_id uuid, p_phone text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max integer;
  v_month_start timestamptz := date_trunc('month', now());
begin
  v_max := public.plan_limit(public.effective_plan_key(p_shop_id), 'MAX_MONTHLY_BOOKINGS');
  if v_max is not null and (
    (select count(*) from public.appointments where shop_id = p_shop_id and created_at >= v_month_start)
    + (select count(*) from public.reservations where shop_id = p_shop_id and created_at >= v_month_start)
  ) >= v_max then
    raise exception 'plan_limit_exceeded: online booking limit reached for this month' using errcode = '23514';
  end if;

  if (
    select count(*) from public.appointments
    where shop_id = p_shop_id and customer_phone = p_phone
      and status in ('pending', 'confirmed') and start_at > now()
  ) + (
    select count(*) from public.reservations
    where shop_id = p_shop_id and customer_phone = p_phone
      and status in ('pending', 'confirmed') and start_at > now()
  ) >= 3 then
    raise exception 'too many upcoming bookings for this phone number' using errcode = 'P0001';
  end if;
  if (
    select count(*) from public.appointments where shop_id = p_shop_id and created_at > now() - interval '1 minute'
  ) + (
    select count(*) from public.reservations where shop_id = p_shop_id and created_at > now() - interval '1 minute'
  ) >= 30 then
    raise exception 'too many booking requests, try again shortly' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.assert_booking_not_abusive(uuid, text) from public, anon, authenticated;
