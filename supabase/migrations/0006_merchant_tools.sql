-- Merchant-side finalization: delivery pricing, low-stock threshold, and a
-- controlled order-status workflow with automatic stock restore on cancel.

-- Shop-level commerce settings the merchant can configure from the dashboard.
alter table public.shops
  add column delivery_fee numeric(12, 2) not null default 0 check (delivery_fee >= 0),
  add column free_delivery_threshold numeric(12, 2) check (free_delivery_threshold >= 0),
  add column low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0);

-- The order now records the delivery fee that was applied at checkout.
alter table public.orders
  add column delivery_fee numeric(12, 2) not null default 0 check (delivery_fee >= 0);

-- Recreate create_order() with a delivery fee. The fee is computed in the
-- browser from the shop's public settings, but it is re-validated here and
-- added to the authoritative item total server-side.
drop function if exists public.create_order(uuid, text, text, jsonb);

create or replace function public.create_order(
  p_shop_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_items jsonb, -- [{ "product_id": uuid, "quantity": int }, ...]
  p_delivery_fee numeric default 0
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
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items must be a non-empty array';
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

  insert into public.orders (shop_id, order_number, customer_name, customer_phone, total, status, delivery_fee)
  values (p_shop_id, v_order_number, trim(p_customer_name), trim(p_customer_phone), 0, 'pending', v_fee)
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

grant execute on function public.create_order(uuid, text, text, jsonb, numeric) to anon, authenticated;

-- set_order_status(): the only sanctioned way to move an order between
-- statuses. Enforces the workflow (no jumping to delivered before it is
-- confirmed, nothing after a terminal state) and, crucially, restores the
-- stock that create_order() decremented whenever an order is cancelled.
-- Runs as SECURITY DEFINER but re-checks ownership against auth.uid().
create or replace function public.set_order_status(p_order_id uuid, p_status text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop_id uuid;
  v_order public.orders;
  v_item record;
begin
  if p_status not in ('pending', 'confirmed', 'paid', 'delivered', 'cancelled') then
    raise exception 'invalid status %', p_status;
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

  if v_order.status = p_status then
    return v_order;
  end if;

  if v_order.status in ('delivered', 'cancelled') then
    raise exception 'order is already %', v_order.status;
  end if;

  if v_order.status = 'pending' and p_status not in ('confirmed', 'paid', 'cancelled') then
    raise exception 'invalid transition from pending to %', p_status;
  end if;
  if v_order.status = 'confirmed' and p_status not in ('paid', 'delivered', 'cancelled') then
    raise exception 'invalid transition from confirmed to %', p_status;
  end if;
  if v_order.status = 'paid' and p_status not in ('delivered', 'cancelled') then
    raise exception 'invalid transition from paid to %', p_status;
  end if;

  -- Restore the stock that was decremented when the order was created.
  if p_status = 'cancelled' then
    for v_item in
      select product_id, quantity
      from public.order_items
      where order_id = v_order.id and product_id is not null
    loop
      update public.products
      set stock = stock + v_item.quantity
      where id = v_item.product_id;
    end loop;
  end if;

  update public.orders
  set status = p_status
  where id = v_order.id
  returning * into v_order;

  return v_order;
end;
$$;

grant execute on function public.set_order_status(uuid, text) to authenticated;
