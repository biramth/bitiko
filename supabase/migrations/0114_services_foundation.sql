-- Services foundation: prestations, vitrine équipe, rendez-vous et réservations
-- pour les business types service (coiffure, restauration, food_services…).
-- Suit les conventions existantes :
--   - prix entiers (0053), rôles via public.shop_role() (0093/0094),
--   - vitrine publique = lignes actives (comme products/categories),
--   - créations invités uniquement via RPC SECURITY DEFINER (comme create_order),
--   - changements de statut via RPC réservés à l'équipe (comme set_order_status).
-- Chaque bloc est drop-if-exists : une exécution interrompue peut être relancée.

-- ── Tables ────────────────────────────────────────────────────────────────

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  category_id uuid null references public.categories(id) on delete set null,
  name text not null check (length(trim(name)) > 0),
  description text null,
  price integer not null default 0 check (price >= 0),
  duration_minutes integer not null default 30 check (duration_minutes >= 5 and duration_minutes <= 480),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists services_shop_idx on public.services (shop_id);
create index if not exists services_shop_active_idx on public.services (shop_id, active);
create index if not exists services_category_idx on public.services (category_id) where category_id is not null;

-- Vitrine équipe (distinct de shop_members, qui gère l'accès au backoffice).
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  role text not null default '',
  specialty text null,
  phone text null,
  email text null,
  avatar_url text null,
  rating numeric(2, 1) null check (rating is null or (rating >= 0 and rating <= 5)),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists team_members_shop_idx on public.team_members (shop_id);
create index if not exists team_members_shop_active_idx on public.team_members (shop_id, active);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  service_id uuid null references public.services(id) on delete set null,
  team_member_id uuid null references public.team_members(id) on delete set null,
  customer_name text not null check (length(trim(customer_name)) > 0),
  customer_phone text not null check (length(trim(customer_phone)) > 0),
  start_at timestamptz not null,
  end_at timestamptz not null check (end_at > start_at),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'done')),
  notes text null,
  created_at timestamptz not null default now()
);

create index if not exists appointments_shop_start_idx on public.appointments (shop_id, start_at);
create index if not exists appointments_team_idx on public.appointments (team_member_id, start_at) where team_member_id is not null;
create index if not exists appointments_service_idx on public.appointments (service_id) where service_id is not null;

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  customer_name text not null check (length(trim(customer_name)) > 0),
  customer_phone text not null check (length(trim(customer_phone)) > 0),
  party_size integer not null default 2 check (party_size >= 1 and party_size <= 100),
  start_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'done')),
  source text not null default 'admin' check (source in ('admin', 'storefront', 'whatsapp')),
  notes text null,
  created_at timestamptz not null default now()
);

-- Dev drift : une table `reservations` expérimentale (hors migrations) existe
-- déjà sur dev avec `reserved_for` / `note` / statuts élargis et 0 ligne.
-- On la réconcilie vers le schéma canonique ci-dessus (prod part de zéro).
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'reservations' and column_name = 'reserved_for') then
    alter table public.reservations rename column reserved_for to start_at;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'reservations' and column_name = 'note') then
    alter table public.reservations rename column note to notes;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'reservations' and column_name = 'source') then
    alter table public.reservations add column source text not null default 'admin' check (source in ('admin', 'storefront', 'whatsapp'));
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'reservations' and column_name = 'notes') then
    alter table public.reservations add column notes text null;
  end if;
  alter table public.reservations drop constraint if exists reservations_status_check;
  alter table public.reservations drop constraint if exists reservations_source_check;
  if not exists (select 1 from pg_constraint where conname = 'reservations_status_check' and conrelid = 'public.reservations'::regclass) then
    alter table public.reservations add constraint reservations_status_check check (status in ('pending', 'confirmed', 'cancelled', 'done'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reservations_source_check' and conrelid = 'public.reservations'::regclass) then
    alter table public.reservations add constraint reservations_source_check check (source in ('admin', 'storefront', 'whatsapp'));
  end if;
  drop policy if exists "reservations: shop access read" on public.reservations;
  drop policy if exists "reservations: shop access insert" on public.reservations;
  drop policy if exists "reservations: shop access update" on public.reservations;
  drop policy if exists "reservations: shop access delete" on public.reservations;
  drop index if exists public.reservations_shop_time_idx;
  drop index if exists public.reservations_shop_status_idx;
end;
$$;

create index if not exists reservations_shop_start_idx on public.reservations (shop_id, start_at);

-- updated_at automatique sur les tables que le marchand édite.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

drop trigger if exists team_members_set_updated_at on public.team_members;
create trigger team_members_set_updated_at
  before update on public.team_members
  for each row execute function public.set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────

alter table public.services enable row level security;
alter table public.team_members enable row level security;
alter table public.appointments enable row level security;
alter table public.reservations enable row level security;

-- Vitrine publique : lignes actives visibles par tous (visiteurs non connectés
-- inclus) ; l'équipe voit tout.
drop policy if exists "services: public read active" on public.services;
create policy "services: public read active" on public.services
  for select using (
    active = true
    or public.shop_role(shop_id) in ('owner', 'manager', 'vendeur')
  );

drop policy if exists "services: owner write" on public.services;
create policy "services: owner write" on public.services
  for all using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

drop policy if exists "services: manager write" on public.services;
create policy "services: manager write" on public.services
  for all using (public.shop_role(shop_id) = 'manager')
  with check (public.shop_role(shop_id) = 'manager');

drop policy if exists "team_members: public read active" on public.team_members;
create policy "team_members: public read active" on public.team_members
  for select using (
    active = true
    or public.shop_role(shop_id) in ('owner', 'manager', 'vendeur')
  );

drop policy if exists "team_members: owner write" on public.team_members;
create policy "team_members: owner write" on public.team_members
  for all using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

drop policy if exists "team_members: manager write" on public.team_members;
create policy "team_members: manager write" on public.team_members
  for all using (public.shop_role(shop_id) = 'manager')
  with check (public.shop_role(shop_id) = 'manager');

-- Rendez-vous / réservations : données clients, jamais publiques. Pas de
-- politique d'insertion directe pour anon/authenticated : la création invitée
-- passe par create_appointment() / create_reservation() (SECURITY DEFINER).
drop policy if exists "appointments: team read" on public.appointments;
create policy "appointments: team read" on public.appointments
  for select using (public.shop_role(shop_id) in ('owner', 'manager', 'vendeur'));

drop policy if exists "appointments: owner insert" on public.appointments;
create policy "appointments: owner insert" on public.appointments
  for insert with check (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

drop policy if exists "appointments: team update" on public.appointments;
create policy "appointments: team update" on public.appointments
  for update using (public.shop_role(shop_id) in ('owner', 'manager', 'vendeur'))
  with check (public.shop_role(shop_id) in ('owner', 'manager', 'vendeur'));

drop policy if exists "appointments: owner delete" on public.appointments;
create policy "appointments: owner delete" on public.appointments
  for delete using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
    or public.shop_role(shop_id) = 'manager'
  );

drop policy if exists "reservations: team read" on public.reservations;
create policy "reservations: team read" on public.reservations
  for select using (public.shop_role(shop_id) in ('owner', 'manager', 'vendeur'));

drop policy if exists "reservations: owner insert" on public.reservations;
create policy "reservations: owner insert" on public.reservations
  for insert with check (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

drop policy if exists "reservations: team update" on public.reservations;
create policy "reservations: team update" on public.reservations
  for update using (public.shop_role(shop_id) in ('owner', 'manager', 'vendeur'))
  with check (public.shop_role(shop_id) in ('owner', 'manager', 'vendeur'));

drop policy if exists "reservations: owner delete" on public.reservations;
create policy "reservations: owner delete" on public.reservations
  for delete using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
    or public.shop_role(shop_id) = 'manager'
  );

-- Exposition Data API (RLS ci-dessus reste le garde-fou sur les lignes).
grant select on public.services to anon;
grant select on public.team_members to anon;
grant select, insert, update, delete on public.services to authenticated;
grant select, insert, update, delete on public.team_members to authenticated;
grant select, insert, update, delete on public.appointments to authenticated;
grant select, insert, update, delete on public.reservations to authenticated;

-- ── RPC invités ───────────────────────────────────────────────────────────

-- Prise de rendez-vous invitée : la prestation et l'équipier doivent appartenir
-- à la boutique et être actifs ; refus si l'équipier est déjà pris sur le
-- créneau (chevauchement avec un RDV non annulé).
create or replace function public.create_appointment(
  p_shop_id uuid,
  p_service_id uuid,
  p_team_member_id uuid default null,
  p_customer_name text default '',
  p_customer_phone text default '',
  p_start_at timestamptz default null,
  p_end_at timestamptz default null
)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service public.services;
  v_member public.team_members;
  v_appointment public.appointments;
begin
  if p_customer_name is null or length(trim(p_customer_name)) = 0 then
    raise exception 'customer_name is required';
  end if;
  if p_customer_phone is null or length(trim(p_customer_phone)) = 0 then
    raise exception 'customer_phone is required';
  end if;
  if p_start_at is null or p_end_at is null or p_end_at <= p_start_at then
    raise exception 'invalid time range';
  end if;
  if p_start_at < now() - interval '5 minutes' then
    raise exception 'appointment must be in the future';
  end if;

  select * into v_service from public.services
  where id = p_service_id and shop_id = p_shop_id;
  if not found then
    raise exception 'service not found';
  end if;
  if not v_service.active then
    raise exception 'service "%" is no longer available', v_service.name;
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
    if exists (
      select 1 from public.appointments
      where team_member_id = p_team_member_id
        and status in ('pending', 'confirmed')
        and start_at < p_end_at
        and end_at > p_start_at
    ) then
      raise exception 'time slot is no longer available';
    end if;
  end if;

  insert into public.appointments
    (shop_id, service_id, team_member_id, customer_name, customer_phone, start_at, end_at, status)
  values
    (p_shop_id, p_service_id, p_team_member_id, trim(p_customer_name), trim(p_customer_phone), p_start_at, p_end_at, 'pending')
  returning * into v_appointment;

  return v_appointment;
end;
$$;

grant execute on function public.create_appointment(uuid, uuid, uuid, text, text, timestamptz, timestamptz) to anon, authenticated;

-- Réservation de table invitée.
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
  v_reservation public.reservations;
begin
  if p_customer_name is null or length(trim(p_customer_name)) = 0 then
    raise exception 'customer_name is required';
  end if;
  if p_customer_phone is null or length(trim(p_customer_phone)) = 0 then
    raise exception 'customer_phone is required';
  end if;
  if p_party_size is null or p_party_size < 1 or p_party_size > 100 then
    raise exception 'invalid party size';
  end if;
  if p_start_at is null or p_start_at < now() - interval '5 minutes' then
    raise exception 'reservation must be in the future';
  end if;
  if not exists (select 1 from public.shops where id = p_shop_id) then
    raise exception 'shop not found';
  end if;

  insert into public.reservations
    (shop_id, customer_name, customer_phone, party_size, start_at, status, source)
  values
    (p_shop_id, trim(p_customer_name), trim(p_customer_phone), p_party_size, p_start_at, 'pending', 'storefront')
  returning * into v_reservation;

  return v_reservation;
end;
$$;

grant execute on function public.create_reservation(uuid, text, text, integer, timestamptz) to anon, authenticated;

-- ── RPC statuts (équipe uniquement) ───────────────────────────────────────

create or replace function public.set_appointment_status(p_appointment_id uuid, p_status text)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appointment public.appointments;
  v_role text;
begin
  if p_status not in ('pending', 'confirmed', 'cancelled', 'done') then
    raise exception 'invalid status %', p_status;
  end if;

  select * into v_appointment from public.appointments where id = p_appointment_id;
  if not found then
    raise exception 'appointment not found';
  end if;

  v_role := public.shop_role(v_appointment.shop_id);
  if v_role is null or v_role not in ('owner', 'manager', 'vendeur') then
    raise exception 'not authorized';
  end if;

  if v_appointment.status = p_status then
    return v_appointment;
  end if;
  if v_appointment.status in ('cancelled', 'done') then
    raise exception 'appointment is already %', v_appointment.status;
  end if;
  if v_appointment.status = 'pending' and p_status not in ('confirmed', 'cancelled') then
    raise exception 'invalid transition from pending to %', p_status;
  end if;
  if v_appointment.status = 'confirmed' and p_status not in ('done', 'cancelled') then
    raise exception 'invalid transition from confirmed to %', p_status;
  end if;

  update public.appointments set status = p_status
  where id = v_appointment.id
  returning * into v_appointment;

  return v_appointment;
end;
$$;

grant execute on function public.set_appointment_status(uuid, text) to authenticated;

create or replace function public.set_reservation_status(p_reservation_id uuid, p_status text)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.reservations;
  v_role text;
begin
  if p_status not in ('pending', 'confirmed', 'cancelled', 'done') then
    raise exception 'invalid status %', p_status;
  end if;

  select * into v_reservation from public.reservations where id = p_reservation_id;
  if not found then
    raise exception 'reservation not found';
  end if;

  v_role := public.shop_role(v_reservation.shop_id);
  if v_role is null or v_role not in ('owner', 'manager', 'vendeur') then
    raise exception 'not authorized';
  end if;

  if v_reservation.status = p_status then
    return v_reservation;
  end if;
  if v_reservation.status in ('cancelled', 'done') then
    raise exception 'reservation is already %', v_reservation.status;
  end if;
  if v_reservation.status = 'pending' and p_status not in ('confirmed', 'cancelled') then
    raise exception 'invalid transition from pending to %', p_status;
  end if;
  if v_reservation.status = 'confirmed' and p_status not in ('done', 'cancelled') then
    raise exception 'invalid transition from confirmed to %', p_status;
  end if;

  update public.reservations set status = p_status
  where id = v_reservation.id
  returning * into v_reservation;

  return v_reservation;
end;
$$;

grant execute on function public.set_reservation_status(uuid, text) to authenticated;
