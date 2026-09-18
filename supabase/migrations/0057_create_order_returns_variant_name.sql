-- create_order already stores order_items.variant_id / variant_name, but its
-- result set didn't include the variant name — so the WhatsApp message sent to
-- the merchant and the customer's confirmation page listed "Robe" instead of
-- "Robe (Rouge / M)". Return it too. A function's return type can't change
-- through CREATE OR REPLACE, hence drop + create (same signature, and like
-- before it keeps the default PUBLIC execute grant: guests place orders).

drop function if exists public.create_order(uuid, text, text, text, jsonb, numeric, text, text);

create function public.create_order(
  p_shop_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_items jsonb,
  p_delivery_fee numeric default 0,
  p_delivery_zone_name text default null,
  p_payment_method text default 'cod'
)
returns table(
  order_id uuid,
  order_number text,
  total numeric,
  product_name text,
  variant_name text,
  unit_price numeric,
  quantity integer,
  subtotal numeric
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_order_id uuid;
  v_order_number text;
  v_total numeric(12, 2) := 0;
  v_fee numeric(12, 2);
  v_item jsonb;
  v_product record;
  v_variant record;
  v_quantity integer;
  v_subtotal numeric(12, 2);
  v_variant_id uuid;
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

    v_variant_id := nullif(v_item ->> 'variant_id', '');
    if v_variant_id is not null then
      select id, product_id, name, price, stock, active into v_variant
      from public.product_variants
      where id = v_variant_id
      for update;

      if not found then
        raise exception 'variant % not found', v_variant_id;
      end if;
      if v_variant.product_id <> v_product.id then
        raise exception 'variant % does not belong to product %', v_variant_id, v_product.id;
      end if;
      if not v_variant.active then
        raise exception 'variant "%" is no longer available', v_variant.name;
      end if;
      if v_variant.stock < v_quantity then
        raise exception 'insufficient stock for "%"', v_variant.name;
      end if;
    else
      if v_product.stock < v_quantity then
        raise exception 'insufficient stock for "%"', v_product.name;
      end if;
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
    v_variant_id := nullif(v_item ->> 'variant_id', '');

    select id, name, price into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid;

    if v_variant_id is not null then
      select id, name, price into v_variant
      from public.product_variants
      where id = v_variant_id;

      v_subtotal := coalesce(v_variant.price, v_product.price) * v_quantity;

      insert into public.order_items (
        order_id, product_id, product_name, variant_id, variant_name, unit_price, quantity, subtotal
      )
      values (
        v_order_id,
        v_product.id,
        v_product.name,
        v_variant.id,
        v_variant.name,
        coalesce(v_variant.price, v_product.price),
        v_quantity,
        v_subtotal
      );

      update public.product_variants set stock = stock - v_quantity where id = v_variant.id;
    else
      v_subtotal := v_product.price * v_quantity;

      insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, subtotal)
      values (v_order_id, v_product.id, v_product.name, v_product.price, v_quantity, v_subtotal);

      -- Only decrement the product's own stock when this line has no variant —
      -- once a product has variants, products.stock is no longer the source of
      -- truth and must not keep draining alongside the variant it sold under.
      update public.products set stock = stock - v_quantity where id = v_product.id;
    end if;

    v_total := v_total + v_subtotal;
  end loop;

  v_total := v_total + v_fee;

  update public.orders set total = v_total where id = v_order_id;

  return query
    select v_order_id, v_order_number, v_total, oi.product_name, oi.variant_name, oi.unit_price, oi.quantity, oi.subtotal
    from public.order_items oi
    where oi.order_id = v_order_id;
end;
$function$;
