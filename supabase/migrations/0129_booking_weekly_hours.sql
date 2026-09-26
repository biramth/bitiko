-- 0129 : horaires de réservation PAR JOUR, avec plusieurs plages, et jours de
-- fermeture exceptionnels.
--
-- Jusqu'ici une boutique n'avait qu'une plage (open_time → close_time) commune à
-- tous les jours ouverts : impossible de fermer le samedi à 13 h, de couper à
-- midi ou de poser un jour de congé. Deux colonnes :
--   * weekly_hours : {"1": [["09:00","12:30"],["14:00","19:00"]], "6": [["09:00","13:00"]], …}
--     clés = jour ISO (1 lundi … 7 dimanche), valeur = plages [début, fin] ;
--     jour absent ou liste vide = fermé. NULL = ancien mode (open_days +
--     open_time/close_time), inchangé : aucune boutique existante ne bouge.
--   * closed_dates : jours fermés à titre exceptionnel (congés, jour férié).
-- Les créneaux (get_booking_slots / get_reservation_slots) et la validation des
-- demandes (booking_slot_within_hours) lisent tous la même source :
-- booking_day_ranges(). Idempotent, re-exécutable.

alter table public.booking_settings
  add column if not exists weekly_hours jsonb,
  add column if not exists closed_dates date[] not null default '{}';

alter table public.booking_settings drop constraint if exists booking_settings_weekly_hours_shape;
alter table public.booking_settings
  add constraint booking_settings_weekly_hours_shape check (
    weekly_hours is null or (jsonb_typeof(weekly_hours) = 'object' and pg_column_size(weekly_hours) < 4096)
  );

-- ── Plages ouvertes d'un jour ─────────────────────────────────────────────

create or replace function public.booking_day_ranges(p_settings public.booking_settings, p_date date)
returns table (range_start time, range_end time)
language plpgsql
stable
as $$
declare
  v_dow integer := extract(isodow from p_date)::integer;
  v_range jsonb;
begin
  if p_date = any (p_settings.closed_dates) then
    return;
  end if;

  if p_settings.weekly_hours is not null then
    for v_range in
      select value from jsonb_array_elements(coalesce(p_settings.weekly_hours -> v_dow::text, '[]'::jsonb))
    loop
      begin
        range_start := (v_range ->> 0)::time;
        range_end := (v_range ->> 1)::time;
      exception when others then
        continue; -- plage mal formée : ignorée plutôt que bloquer toute la boutique
      end;
      if range_end > range_start then
        return next;
      end if;
    end loop;
  elsif v_dow = any (p_settings.open_days) then
    range_start := p_settings.open_time;
    range_end := p_settings.close_time;
    return next;
  end if;
end;
$$;

revoke all on function public.booking_day_ranges(public.booking_settings, date) from public, anon, authenticated;

-- ── Réglages par défaut (colonnes ajoutées à la fin du type composite) ────

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
        'timezone', coalesce((select c.timezone from public.shops s join public.countries c on c.code = s.country_code where s.id = p_shop_id), 'Africa/Dakar'),
        'open_time', '09:00',
        'close_time', '19:00',
        'open_days', jsonb_build_array(1, 2, 3, 4, 5, 6),
        'slot_minutes', 30,
        'max_days_ahead', 60,
        'table_capacity', 40,
        'reservation_minutes', 90,
        'updated_at', now(),
        'closed_dates', '[]'::jsonb
      )
    )
  );
$$;

revoke all on function public.effective_booking_settings(uuid) from public, anon, authenticated;

-- ── Validation d'une demande (tient dans UNE plage du jour) ───────────────

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
  return exists (
    select 1 from public.booking_day_ranges(p_settings, v_local_start::date) r
    where v_local_start::time >= r.range_start and v_local_end::time <= r.range_end
  );
end;
$$;

revoke all on function public.booking_slot_within_hours(public.booking_settings, timestamptz, integer) from public, anon, authenticated;

-- ── Créneaux de rendez-vous ───────────────────────────────────────────────

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
  v_range record;
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
     or p_date > (now() at time zone v_settings.timezone)::date + v_settings.max_days_ahead then
    return;
  end if;

  select greatest(count(*), 1) into v_capacity
  from public.team_members where shop_id = p_shop_id and active = true;

  for v_range in select * from public.booking_day_ranges(v_settings, p_date) order by range_start loop
    v_cursor := (p_date + v_range.range_start) at time zone v_settings.timezone;
    v_day_end := (p_date + v_range.range_end) at time zone v_settings.timezone;

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
  end loop;
end;
$$;

grant execute on function public.get_booking_slots(uuid, uuid, uuid, date) to anon, authenticated;

-- ── Créneaux de table ─────────────────────────────────────────────────────

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
  v_range record;
  v_cursor timestamptz;
  v_day_end timestamptz;
  v_seated integer;
begin
  if p_party_size is null or p_party_size < 1 or p_party_size > 100 then
    return;
  end if;
  v_settings := public.effective_booking_settings(p_shop_id);

  if p_date < (now() at time zone v_settings.timezone)::date
     or p_date > (now() at time zone v_settings.timezone)::date + v_settings.max_days_ahead then
    return;
  end if;

  for v_range in select * from public.booking_day_ranges(v_settings, p_date) order by range_start loop
    v_cursor := (p_date + v_range.range_start) at time zone v_settings.timezone;
    v_day_end := (p_date + v_range.range_end) at time zone v_settings.timezone;

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
  end loop;
end;
$$;

grant execute on function public.get_reservation_slots(uuid, integer, date) to anon, authenticated;
