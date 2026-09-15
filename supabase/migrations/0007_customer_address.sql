-- Capture the buyer's delivery address at checkout so the merchant has it
-- on hand without having to ask again over WhatsApp. Nullable at the schema
-- level (existing rows have none), but create_order() below requires it for
-- every new order.
alter table public.orders add column customer_address text;

drop function if exists public.create_order(uuid, text, text, jsonb, numeric);

create or replace function public.create_order(
  p_shop_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
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
  if p_customer_address is null or length(trim(p_customer_address)) = 0 then
    raise exception 'customer_address is required';
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

  insert into public.orders (shop_id, order_number, customer_name, customer_phone, customer_address, total, status, delivery_fee)
  values (p_shop_id, v_order_number, trim(p_customer_name), trim(p_customer_phone), trim(p_customer_address), 0, 'pending', v_fee)
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

grant execute on function public.create_order(uuid, text, text, text, jsonb, numeric) to anon, authenticated;
