-- 0009: delivery zones by neighbourhood/secteur + payment method + fee adjust.
--
-- Zones are deliberately granular (quartier/secteur) and 100% merchant-managed
-- (add / edit / rename / toggle / delete). Every order keeps snapshots
-- (zone name + fee + payment method) so historical orders never drift.

-- 1) delivery_zones --------------------------------------------------------
create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  fee numeric(12, 2) not null default 0 check (fee >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index delivery_zones_shop_name_key on public.delivery_zones (shop_id, lower(name));

alter table public.delivery_zones enable row level security;

create policy "delivery_zones: public read" on public.delivery_zones
  for select using (true);

create policy "delivery_zones: owner insert" on public.delivery_zones
  for insert with check (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

create policy "delivery_zones: owner update" on public.delivery_zones
  for update using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

create policy "delivery_zones: owner delete" on public.delivery_zones
  for delete using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

create trigger delivery_zones_set_updated_at before update on public.delivery_zones
  for each row execute function set_updated_at();

-- 2) order snapshots --------------------------------------------------------
alter table public.orders add column delivery_zone_name text;
alter table public.orders add column payment_method text not null default 'cod'
  check (payment_method in ('cod', 'mobile_money'));

-- 3) create_order: capture zone + payment intent ---------------------------
drop function if exists public.create_order(uuid, text, text, text, jsonb, numeric);

create or replace function public.create_order(
  p_shop_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_items jsonb, -- [{ "product_id": uuid, "quantity": int }, ...]
  p_delivery_fee numeric default 0,
  p_delivery_zone_name text default null,
  p_payment_method text default 'cod'
)
returns table (
  order_id uuid,
  order_number text,
  total numeric,
  product_name text,
  unit_price numeric,
  quantity integer,
  subtotal numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_total numeric(12, 2) := 0;
  v_fee numeric(12, 2);
  v_item jsonb;
  v_product record;
  v_quantity integer;
  v_subtotal numeric(12, 2);
begin
  if p_customer_name is null or length(trim(p_customer_name)) = 0 then
    raise exception 'customer_name is required';
  end if;
  if p_customer_phone is null or length(trim(p_customer_phone)) = 0 then
    raise exception 'customer_phone is required';
  end if;
  if p_customer_address is null or length(trim(p_customer_address)) = 0 then
    raise exception 'customer_address is required';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items must be a non-empty array';
  end if;
  if p_payment_method not in ('cod', 'mobile_money') then
    raise exception 'invalid payment method %', p_payment_method;
  end if;

  v_fee := coalesce(p_delivery_fee, 0);
  if v_fee < 0 then
    raise exception 'delivery fee cannot be negative';
  end if;

  -- Pass 1: lock and validate every line before writing anything.
  for v_item in
    select value from jsonb_array_elements(p_items) order by (value ->> 'product_id')
  loop
    v_quantity := (v_item ->> 'quantity')::integer;
    if v_quantity is null or v_quantity <= 0 then
      raise exception 'invalid quantity for product %', v_item ->> 'product_id';
    end if;

    select id, name, price, stock, active into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid
      and shop_id = p_shop_id
    for update;

    if not found then
      raise exception 'product % not found', v_item ->> 'product_id';
    end if;
    if not v_product.active then
      raise exception 'product "%" is no longer available', v_product.name;
    end if;
    if v_product.stock < v_quantity then
      raise exception 'insufficient stock for "%"', v_product.name;
    end if;
  end loop;

  v_order_number := 'CMD-' || nextval('public.order_number_seq');

  insert into public.orders (
    shop_id, order_number, customer_name, customer_phone, customer_address,
    total, status, delivery_fee, delivery_zone_name, payment_method
  )
  values (
    p_shop_id,
    v_order_number,
    trim(p_customer_name),
    trim(p_customer_phone),
    trim(p_customer_address),
    0,
    'pending',
    v_fee,
    nullif(trim(coalesce(p_delivery_zone_name, '')), ''),
    p_payment_method
  )
  returning id into v_order_id;

  -- Pass 2: everything validated and locked, write items + decrement stock.
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;

    select id, name, price into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid;

    v_subtotal := v_product.price * v_quantity;
    v_total := v_total + v_subtotal;

    insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, subtotal)
    values (v_order_id, v_product.id, v_product.name, v_product.price, v_quantity, v_subtotal);

    update public.products set stock = stock - v_quantity where id = v_product.id;
  end loop;

  v_total := v_total + v_fee;

  update public.orders set total = v_total where id = v_order_id;

  return query
    select v_order_id, v_order_number, v_total, oi.product_name, oi.unit_price, oi.quantity, oi.subtotal
    from public.order_items oi
    where oi.order_id = v_order_id;
end;
$$;

grant execute on function public.create_order(uuid, text, text, text, jsonb, numeric, text, text) to anon, authenticated;

-- 4) set_order_delivery_fee --------------------------------------------------
-- The merchant confirms delivery by phone, so the fee is adjustable afterwards.
-- The order total is recomputed as (old total - old fee) + new fee. Terminal
-- orders (delivered, cancelled) are frozen.
create or replace function public.set_order_delivery_fee(p_order_id uuid, p_fee numeric)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop_id uuid;
  v_order public.orders;
  v_subtotal numeric(12, 2);
begin
  if p_fee is null or p_fee < 0 then
    raise exception 'invalid delivery fee';
  end if;

  select s.id into v_shop_id
  from public.shops s
  where s.owner_id = auth.uid()
  limit 1;

  if v_shop_id is null then
    raise exception 'not authorized';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id and shop_id = v_shop_id
  for update;

  if not found then
    raise exception 'order not found';
  end if;

  if v_order.status in ('delivered', 'cancelled') then
    raise exception 'order is already %', v_order.status;
  end if;

  v_subtotal := v_order.total - v_order.delivery_fee;

  update public.orders
  set delivery_fee = p_fee, total = v_subtotal + p_fee
  where id = v_order.id
  returning * into v_order;

  return v_order;
end;
$$;

grant execute on function public.set_order_delivery_fee(uuid, numeric) to authenticated;

-- 5) seed_default_delivery_zones ----------------------------------------------
-- Idempotent: only inserts when the shop has no zone yet. Called right after
-- shop onboarding and by the backfill below.
create or replace function public.seed_default_delivery_zones(p_shop_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fee numeric(12, 2);
  v_zone text;
begin
  if exists (select 1 from public.delivery_zones where shop_id = p_shop_id) then
    return;
  end if;

  select coalesce(delivery_fee, 0) into v_fee from public.shops where id = p_shop_id;

  foreach v_zone in array array[
    'Dakar Plateau', 'Ouakam', 'Mermoz', 'Almadies', 'Sacré-Cœur', 'Grand Dakar',
    'HLM', 'Parcelles Assainies', 'Médina', 'Yoff'
  ]
  loop
    insert into public.delivery_zones (shop_id, name, fee)
    values (p_shop_id, v_zone, v_fee);
  end loop;
end;
$$;

grant execute on function public.seed_default_delivery_zones(uuid) to authenticated;

-- Backfill every existing shop with the default set.
do $$
declare r record;
begin
  for r in select id from public.shops loop
    perform public.seed_default_delivery_zones(r.id);
  end loop;
end $$;