-- 0010: delivery secteurs -> villes (hierarchical, merchant-managed).
--
-- The merchant models delivery as NAMEABLE SECTEURS (ex. "Dakar", "Rufisque",
-- "Thiès") where the SECTEUR carries the price, and each secteur contains a
-- list of VILLES the customer picks directly at checkout. A ville inherits the
-- price of its secteur. This replaces the flat delivery_zones model from 0009.
--
-- Orders keep their snapshot (delivery_zone_name = the ville chosen + the fee
-- at confirmation), created by the existing create_order p_delivery_zone_name
-- parameter — no order-flow break, history never drifts.

-- 1) delivery_secteurs --------------------------------------------------------
create table public.delivery_secteurs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  fee numeric(12, 2) not null default 0 check (fee >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index delivery_secteurs_shop_name_key on public.delivery_secteurs (shop_id, lower(name));

alter table public.delivery_secteurs enable row level security;

create policy "delivery_secteurs: public read" on public.delivery_secteurs
  for select using (true);

create policy "delivery_secteurs: owner insert" on public.delivery_secteurs
  for insert with check (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

create policy "delivery_secteurs: owner update" on public.delivery_secteurs
  for update using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

create policy "delivery_secteurs: owner delete" on public.delivery_secteurs
  for delete using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

create trigger delivery_secteurs_set_updated_at before update on public.delivery_secteurs
  for each row execute function set_updated_at();

-- 2) delivery_villes ----------------------------------------------------------
create table public.delivery_villes (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  secteur_id uuid not null references public.delivery_secteurs(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index delivery_villes_secteur_name_key on public.delivery_villes (secteur_id, lower(name));

create index delivery_villes_shop_id_idx on public.delivery_villes (shop_id);

alter table public.delivery_villes enable row level security;

create policy "delivery_villes: public read" on public.delivery_villes
  for select using (true);

create policy "delivery_villes: owner insert" on public.delivery_villes
  for insert with check (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

create policy "delivery_villes: owner update" on public.delivery_villes
  for update using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

create policy "delivery_villes: owner delete" on public.delivery_villes
  for delete using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

create trigger delivery_villes_set_updated_at before update on public.delivery_villes
  for each row execute function set_updated_at();

-- 3) Backfill: one "Dakar" secteur per shop, each old zone becomes a ville ---
do $$
declare
  r record;
  v_secteur_id uuid;
begin
  for r in select distinct s.id as shop_id
    from public.shops s
  loop
    insert into public.delivery_secteurs (shop_id, name, fee)
    values (r.shop_id, 'Dakar', 0)
    returning id into v_secteur_id;

    insert into public.delivery_villes (shop_id, secteur_id, name, is_active)
    select d.shop_id, v_secteur_id, d.name, d.is_active
    from public.delivery_zones d
    where d.shop_id = r.shop_id;
  end loop;
end $$;

drop table if exists public.delivery_zones;

-- 4) seed_default_delivery_secteurs (idempotent) -------------------------------
-- Creates one "Dakar" secteur + 10 Dakar villes. Skipped when the shop already
-- has secteurs. Called right after shop onboarding and by the backfill below.
create or replace function public.seed_default_delivery_secteurs(p_shop_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secteur_id uuid;
  v_ville text;
begin
  if exists (select 1 from public.delivery_secteurs where shop_id = p_shop_id) then
    return;
  end if;

  insert into public.delivery_secteurs (shop_id, name, fee)
  values (p_shop_id, 'Dakar', 0)
  returning id into v_secteur_id;

  foreach v_ville in array array[
    'Dakar Plateau', 'Ouakam', 'Mermoz', 'Almadies', 'Sacré-Cœur', 'Grand Dakar',
    'HLM', 'Parcelles Assainies', 'Médina', 'Yoff'
  ]
  loop
    insert into public.delivery_villes (shop_id, secteur_id, name, is_active)
    values (p_shop_id, v_secteur_id, v_ville, true);
  end loop;
end;
$$;

grant execute on function public.seed_default_delivery_secteurs(uuid) to authenticated;

-- Backfill every existing shop that has none (seed only runs at onboarding).
do $$
declare r record;
begin
  for r in
    select s.id from public.shops s
    where not exists (select 1 from public.delivery_secteurs x where x.shop_id = s.id)
  loop
    perform public.seed_default_delivery_secteurs(r.id);
  end loop;
end $$;
