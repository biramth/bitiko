-- 0124 : notifications de réservation.
--   * `owner_notified_at` : garde d'unicité de l'email « nouvelle demande »
--     (l'endpoint /api/booking-notify ne notifie qu'une fois, et seulement pour
--     une demande créée dans les dernières minutes — il ne peut pas servir à
--     spammer un marchand avec d'anciens rendez-vous).
--   * événements APPOINTMENT_CREATED / RESERVATION_CREATED dans le journal
--     `business_events` (automatisations, PHASE-13), comme ORDER_CREATED.
-- Le trigger observe les écritures sans jamais les bloquer.
-- Idempotent, re-exécutable.

alter table public.appointments add column if not exists owner_notified_at timestamptz;
alter table public.reservations add column if not exists owner_notified_at timestamptz;

create or replace function public.emit_booking_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'appointments' then
    insert into public.business_events (shop_id, type, payload)
    values (new.shop_id, 'APPOINTMENT_CREATED', jsonb_build_object(
      'appointment_id', new.id,
      'customer_name', new.customer_name,
      'service_name', coalesce(new.service_name, ''),
      'start_at', new.start_at
    ));
  else
    insert into public.business_events (shop_id, type, payload)
    values (new.shop_id, 'RESERVATION_CREATED', jsonb_build_object(
      'reservation_id', new.id,
      'customer_name', new.customer_name,
      'party_size', new.party_size,
      'start_at', new.start_at
    ));
  end if;
  return new;
exception
  when others then
    raise warning 'emit_booking_events failed (non-blocking): %', sqlerrm;
    return new;
end;
$$;

revoke all on function public.emit_booking_events() from public, anon, authenticated;

drop trigger if exists appointments_emit_events on public.appointments;
create trigger appointments_emit_events
  after insert on public.appointments
  for each row execute function public.emit_booking_events();

drop trigger if exists reservations_emit_events on public.reservations;
create trigger reservations_emit_events
  after insert on public.reservations
  for each row execute function public.emit_booking_events();
