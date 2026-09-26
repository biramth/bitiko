-- 0122 : réservation réelle — rendez-vous et réservations de table durcis.
--
-- Problèmes corrigés (audit 2026-09-26) :
--   * la durée d'un rendez-vous venait du client ; désormais fin = début + durée
--     de la prestation (source serveur) ;
--   * contrôle de chevauchement sans verrou (course entre deux réservations) et
--     inexistant sans équipier : capacité = nb d'équipiers actifs, sous verrou
--     transactionnel ;
--   * aucun horaire, horizon ni capacité de tables : table `booking_settings` ;
--   * téléphone non normalisé, aucun anti-spam sur les RPC anonymes ;
--   * rendez-vous sans copie de la prestation : nom/prix/durée figés à la prise
--     (comme order_items) pour que la suppression d'une prestation n'efface pas
--     l'historique ;
--   * aucune disponibilité publique (anon ne peut pas lire appointments) : RPC
--     `get_booking_slots` / `get_reservation_slots` qui ne renvoient que des
--     débuts de créneaux libres.
-- Le personnel (owner/manager/vendeur) peut saisir un rendez-vous passé (client
-- venu sans réserver) ; les invités jamais.
-- Idempotent, re-exécutable.

-- ── Réglages de réservation (publics : horaires d'ouverture) ──────────────

create table if not exists public.booking_settings (
  shop_id uuid primary key references public.shops(id) on delete cascade,
  timezone text not null default 'Africa/Dakar',
  open_time time not null default '09:00',
  close_time time not null default '19:00',
  -- Jours ouverts, 1 = lundi … 7 = dimanche (ISO).
  open_days integer[] not null default '{1,2,3,4,5,6}',
  slot_minutes integer not null default 30 check (slot_minutes between 5 and 240),
  max_days_ahead integer not null default 60 check (max_days_ahead between 1 and 365),
  -- Réservations de table : couverts simultanés max et durée d'occupation.
  table_capacity integer not null default 40 check (table_capacity between 1 and 1000),
  reservation_minutes integer not null default 90 check (reservation_minutes between 30 and 360),
  updated_at timestamptz not null default now(),
  check (close_time > open_time),
  check (cardinality(open_days) between 1 and 7)
);

drop trigger if exists booking_settings_set_updated_at on public.booking_settings;
create trigger booking_settings_set_updated_at
  before update on public.booking_settings
  for each row execute function public.set_updated_at();

alter table public.booking_settings enable row level security;

drop policy if exists "booking_settings: public read" on public.booking_settings;
create policy "booking_settings: public read" on public.booking_settings
  for select using (true);

drop policy if exists "booking_settings: staff write" on public.booking_settings;
create policy "booking_settings: staff write" on public.booking_settings
  for all using (public.shop_role(shop_id) in ('owner', 'manager'))
  with check (public.shop_role(shop_id) in ('owner', 'manager'));

grant select on public.booking_settings to anon, authenticated;
grant insert, update, delete on public.booking_settings to authenticated;

-- ── Copie de la prestation sur le rendez-vous ─────────────────────────────

alter table public.appointments
  add column if not exists service_name text,
  add column if not exists service_price integer,
  add column if not exists service_duration integer;

update public.appointments a
set service_name = s.name, service_price = s.price, service_duration = s.duration_minutes
from public.services s
where a.service_id = s.id and a.service_name is null;

create index if not exists appointments_shop_phone_idx on public.appointments (shop_id, customer_phone);
create index if not exists reservations_shop_phone_idx on public.reservations (shop_id, customer_phone);

-- ── Helpers internes ──────────────────────────────────────────────────────

-- Réglages effectifs (valeurs par défaut si la boutique n'a rien configuré).
create or replace function public.effective_booking_settings(p_shop_id uuid)
returns public.booking_settings
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select b from public.booking_settings b where b.shop_id = p_shop_id),
    -- Construit par NOM de colonne : ajouter une colonne à booking_settings ne
    -- casse plus cette fonction (un row(...) positionnel cassait à chaque ajout).
    jsonb_populate_record(
      null::public.booking_settings,
      jsonb_build_object(
        'shop_id', p_shop_id,
        'timezone', 'Africa/Dakar',
        'open_time', '09:00',
        'close_time', '19:00',
        'open_days', jsonb_build_array(1, 2, 3, 4, 5, 6),
        'slot_minutes', 30,
        'max_days_ahead', 60,
        'table_capacity', 40,
        'reservation_minutes', 90,
        'updated_at', now()
      )
    )
  );
$$;

revoke all on function public.effective_booking_settings(uuid) from public, anon, authenticated;

-- Le créneau [p_start, p_start+p_minutes) tient-il dans les horaires ?
create or replace function public.booking_slot_within_hours(
  p_settings public.booking_settings,
  p_start timestamptz,
  p_minutes integer
)
returns boolean
language plpgsql
stable
as $$
declare
  v_local_start timestamp := p_start at time zone p_settings.timezone;
  v_local_end timestamp := (p_start + make_interval(mins => p_minutes)) at time zone p_settings.timezone;
begin
  if v_local_start::date <> v_local_end::date then
    return false;
  end if;
  if not (extract(isodow from v_local_start)::integer = any (p_settings.open_days)) then
    return false;
  end if;
  return v_local_start::time >= p_settings.open_time and v_local_end::time <= p_settings.close_time;
end;
$$;

revoke all on function public.booking_slot_within_hours(public.booking_settings, timestamptz, integer) from public, anon, authenticated;

-- Normalisation du téléphone d'une réservation : point d'extension unique (le
-- pays de la boutique s'y branchera). Le schéma de dev a divergé du dépôt
-- (normalize_sn_phone remplacé par normalize_phone(numéro, pays)) : la fonction
-- choisit celle qui existe, résolue à l'exécution (plpgsql), sans dépendance
-- de création.
create or replace function public.booking_normalize_phone(p_shop_id uuid, p_phone text)
returns text
language plpgsql
stable
as $$
begin
  if to_regprocedure('public.normalize_sn_phone(text)') is not null then
    return public.normalize_sn_phone(p_phone);
  end if;
  return public.normalize_phone(p_phone, 'SN');
end;
$$;

revoke all on function public.booking_normalize_phone(uuid, text) from public, anon, authenticated;

-- Anti-spam invité : au plus 3 réservations futures actives par téléphone et
-- boutique, et au plus 30 créations/minute par boutique.
create or replace function public.assert_booking_not_abusive(p_shop_id uuid, p_phone text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
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

-- ── create_appointment : nouvelle signature (durée dérivée du serveur) ────

drop function if exists public.create_appointment(uuid, uuid, uuid, text, text, timestamptz, timestamptz);

create or replace function public.create_appointment(
  p_shop_id uuid,
  p_service_id uuid,
  p_team_member_id uuid default null,
  p_customer_name text default '',
  p_customer_phone text default '',
  p_start_at timestamptz default null
)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.booking_settings;
  v_service public.services;
  v_member public.team_members;
  v_phone text;
  v_end timestamptz;
  v_is_staff boolean;
  v_capacity integer;
  v_overlapping integer;
  v_appointment public.appointments;
begin
  if p_customer_name is null or length(trim(p_customer_name)) = 0 then
    raise exception 'customer_name is required';
  end if;
  v_phone := public.booking_normalize_phone(p_shop_id, p_customer_phone);
  if v_phone is null then
    raise exception 'customer_phone is required';
  end if;
  if p_start_at is null then
    raise exception 'invalid time range';
  end if;

  v_is_staff := coalesce(public.shop_role(p_shop_id) in ('owner', 'manager', 'vendeur'), false);

  select * into v_service from public.services
  where id = p_service_id and shop_id = p_shop_id;
  if not found then
    raise exception 'service not found';
  end if;
  if not v_service.active then
    raise exception 'service "%" is no longer available', v_service.name;
  end if;

  v_end := p_start_at + make_interval(mins => v_service.duration_minutes);
  v_settings := public.effective_booking_settings(p_shop_id);

  -- Les invités réservent dans le futur, dans les horaires et l'horizon ; le
  -- personnel peut saisir a posteriori (client venu sans réserver).
  if not v_is_staff then
    if p_start_at < now() then
      raise exception 'appointment must be in the future';
    end if;
    if p_start_at > now() + make_interval(days => v_settings.max_days_ahead) then
      raise exception 'appointment is too far in the future';
    end if;
    if not public.booking_slot_within_hours(v_settings, p_start_at, v_service.duration_minutes) then
      raise exception 'outside opening hours';
    end if;
    perform public.assert_booking_not_abusive(p_shop_id, v_phone);
  end if;

  if p_team_member_id is not null then
    select * into v_member from public.team_members
    where id = p_team_member_id and shop_id = p_shop_id;
    if not found then
      raise exception 'team member not found';
    end if;
    if not v_member.active then
      raise exception '"%" is no longer available', v_member.name;
    end if;
  end if;

  -- Verrou par boutique : sérialise les prises de rendez-vous concurrentes
  -- (le test de chevauchement + l'insert ne sont plus séparables).
  perform pg_advisory_xact_lock(hashtextextended('appointments:' || p_shop_id::text, 0));

  -- Capacité de la boutique = équipiers actifs (au moins 1) : un rendez-vous
  -- sans équipier occupe une place, un rendez-vous avec équipier aussi.
  select greatest(count(*), 1) into v_capacity
  from public.team_members where shop_id = p_shop_id and active = true;
  select count(*) into v_overlapping
  from public.appointments
  where shop_id = p_shop_id
    and status in ('pending', 'confirmed')
    and start_at < v_end
    and end_at > p_start_at;
  if v_overlapping >= v_capacity then
    raise exception 'time slot is no longer available';
  end if;

  if p_team_member_id is not null and exists (
    select 1 from public.appointments
    where team_member_id = p_team_member_id
      and status in ('pending', 'confirmed')
      and start_at < v_end
      and end_at > p_start_at
  ) then
    raise exception 'time slot is no longer available';
  end if;

  insert into public.appointments
    (shop_id, service_id, team_member_id, customer_name, customer_phone, start_at, end_at, status,
     service_name, service_price, service_duration)
  values
    (p_shop_id, p_service_id, p_team_member_id, trim(p_customer_name), v_phone, p_start_at, v_end, 'pending',
     v_service.name, v_service.price, v_service.duration_minutes)
  returning * into v_appointment;

  return v_appointment;
end;
$$;

grant execute on function public.create_appointment(uuid, uuid, uuid, text, text, timestamptz) to anon, authenticated;

-- ── create_reservation : horaires, capacité, anti-spam ────────────────────

create or replace function public.create_reservation(
  p_shop_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_party_size integer,
  p_start_at timestamptz
)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.booking_settings;
  v_phone text;
  v_is_staff boolean;
  v_seated integer;
  v_reservation public.reservations;
begin
  if p_customer_name is null or length(trim(p_customer_name)) = 0 then
    raise exception 'customer_name is required';
  end if;
  v_phone := public.booking_normalize_phone(p_shop_id, p_customer_phone);
  if v_phone is null then
    raise exception 'customer_phone is required';
  end if;
  if p_party_size is null or p_party_size < 1 or p_party_size > 100 then
    raise exception 'invalid party size';
  end if;
  if p_start_at is null then
    raise exception 'reservation must be in the future';
  end if;
  if not exists (select 1 from public.shops where id = p_shop_id) then
    raise exception 'shop not found';
  end if;

  v_is_staff := coalesce(public.shop_role(p_shop_id) in ('owner', 'manager', 'vendeur'), false);
  v_settings := public.effective_booking_settings(p_shop_id);

  if not v_is_staff then
    if p_start_at < now() then
      raise exception 'reservation must be in the future';
    end if;
    if p_start_at > now() + make_interval(days => v_settings.max_days_ahead) then
      raise exception 'reservation is too far in the future';
    end if;
    if not public.booking_slot_within_hours(v_settings, p_start_at, v_settings.reservation_minutes) then
      raise exception 'outside opening hours';
    end if;
    perform public.assert_booking_not_abusive(p_shop_id, v_phone);
  end if;

  perform pg_advisory_xact_lock(hashtextextended('reservations:' || p_shop_id::text, 0));

  select coalesce(sum(party_size), 0) into v_seated
  from public.reservations
  where shop_id = p_shop_id
    and status in ('pending', 'confirmed')
    and start_at < p_start_at + make_interval(mins => v_settings.reservation_minutes)
    and start_at + make_interval(mins => v_settings.reservation_minutes) > p_start_at;
  if v_seated + p_party_size > v_settings.table_capacity then
    raise exception 'no table available for this slot';
  end if;

  insert into public.reservations
    (shop_id, customer_name, customer_phone, party_size, start_at, status, source)
  values
    (p_shop_id, trim(p_customer_name), v_phone, p_party_size, p_start_at, 'pending',
     case when v_is_staff then 'admin' else 'storefront' end)
  returning * into v_reservation;

  return v_reservation;
end;
$$;

grant execute on function public.create_reservation(uuid, text, text, integer, timestamptz) to anon, authenticated;

-- ── Disponibilités publiques (aucune donnée client n'en sort) ─────────────

-- Débuts de créneaux libres pour une prestation un jour donné (date locale de
-- la boutique). Sans équipier : libre tant que la capacité n'est pas atteinte.
create or replace function public.get_booking_slots(
  p_shop_id uuid,
  p_service_id uuid,
  p_team_member_id uuid,
  p_date date
)
returns table (slot_start timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_settings public.booking_settings;
  v_service public.services;
  v_capacity integer;
  v_cursor timestamptz;
  v_day_end timestamptz;
  v_end timestamptz;
  v_busy integer;
begin
  select * into v_service from public.services
  where id = p_service_id and shop_id = p_shop_id and active = true;
  if not found then
    return;
  end if;
  if p_team_member_id is not null and not exists (
    select 1 from public.team_members where id = p_team_member_id and shop_id = p_shop_id and active = true
  ) then
    return;
  end if;
  v_settings := public.effective_booking_settings(p_shop_id);

  if p_date < (now() at time zone v_settings.timezone)::date
     or p_date > (now() at time zone v_settings.timezone)::date + v_settings.max_days_ahead
     or not (extract(isodow from p_date)::integer = any (v_settings.open_days)) then
    return;
  end if;

  select greatest(count(*), 1) into v_capacity
  from public.team_members where shop_id = p_shop_id and active = true;

  v_cursor := (p_date + v_settings.open_time) at time zone v_settings.timezone;
  v_day_end := (p_date + v_settings.close_time) at time zone v_settings.timezone;

  while v_cursor + make_interval(mins => v_service.duration_minutes) <= v_day_end loop
    v_end := v_cursor + make_interval(mins => v_service.duration_minutes);
    if v_cursor > now() then
      select count(*) into v_busy from public.appointments
      where shop_id = p_shop_id and status in ('pending', 'confirmed')
        and start_at < v_end and end_at > v_cursor;
      if v_busy < v_capacity and (
        p_team_member_id is null or not exists (
          select 1 from public.appointments
          where team_member_id = p_team_member_id and status in ('pending', 'confirmed')
            and start_at < v_end and end_at > v_cursor
        )
      ) then
        slot_start := v_cursor;
        return next;
      end if;
    end if;
    v_cursor := v_cursor + make_interval(mins => v_settings.slot_minutes);
  end loop;
end;
$$;

grant execute on function public.get_booking_slots(uuid, uuid, uuid, date) to anon, authenticated;

-- Créneaux de table libres pour un nombre de couverts un jour donné.
create or replace function public.get_reservation_slots(
  p_shop_id uuid,
  p_party_size integer,
  p_date date
)
returns table (slot_start timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_settings public.booking_settings;
  v_cursor timestamptz;
  v_day_end timestamptz;
  v_seated integer;
begin
  if p_party_size is null or p_party_size < 1 or p_party_size > 100 then
    return;
  end if;
  v_settings := public.effective_booking_settings(p_shop_id);

  if p_date < (now() at time zone v_settings.timezone)::date
     or p_date > (now() at time zone v_settings.timezone)::date + v_settings.max_days_ahead
     or not (extract(isodow from p_date)::integer = any (v_settings.open_days)) then
    return;
  end if;

  v_cursor := (p_date + v_settings.open_time) at time zone v_settings.timezone;
  v_day_end := (p_date + v_settings.close_time) at time zone v_settings.timezone;

  while v_cursor + make_interval(mins => v_settings.reservation_minutes) <= v_day_end loop
    if v_cursor > now() then
      select coalesce(sum(party_size), 0) into v_seated
      from public.reservations
      where shop_id = p_shop_id and status in ('pending', 'confirmed')
        and start_at < v_cursor + make_interval(mins => v_settings.reservation_minutes)
        and start_at + make_interval(mins => v_settings.reservation_minutes) > v_cursor;
      if v_seated + p_party_size <= v_settings.table_capacity then
        slot_start := v_cursor;
        return next;
      end if;
    end if;
    v_cursor := v_cursor + make_interval(mins => v_settings.slot_minutes);
  end loop;
end;
$$;

grant execute on function public.get_reservation_slots(uuid, integer, date) to anon, authenticated;
