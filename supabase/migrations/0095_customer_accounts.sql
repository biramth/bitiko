-- Customer accounts (optional — guest checkout is untouched): an email can be
-- attached to an order (write-once, shortly after placement) and to the
-- customer row, letting buyers log in with a magic code and see their own
-- order history. No WhatsApp/SMS OTP infra needed — Supabase email OTP.
alter table public.orders
  add column if not exists customer_email text null
  check (customer_email is null or (char_length(customer_email) <= 254));

alter table public.customers
  add column if not exists email text null
  check (email is null or (char_length(email) <= 254));

-- One account per shop: same email on two shops = two customer rows.
create unique index if not exists customers_shop_email_key
  on public.customers (shop_id, lower(email)) where email is not null;

-- Carry the latest email into the customer row (phone stays the identity).
create or replace function public.refresh_shop_customer(p_shop_id uuid, p_phone text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_total numeric(12, 2);
  v_first timestamptz;
  v_last timestamptz;
  v_name text;
  v_address text;
  v_email text;
begin
  select
    count(*)::integer,
    coalesce(sum(total), 0)::numeric(12, 2),
    min(created_at),
    max(created_at)
    into v_count, v_total, v_first, v_last
  from public.orders
  where shop_id = p_shop_id
    and customer_phone = p_phone
    and status <> 'cancelled';

  if v_count = 0 then
    delete from public.customers where shop_id = p_shop_id and phone = p_phone;
    return;
  end if;

  select o.customer_name, o.customer_address, o.customer_email
    into v_name, v_address, v_email
  from public.orders o
  where o.shop_id = p_shop_id
    and o.customer_phone = p_phone
    and o.status <> 'cancelled'
  order by (o.customer_email is not null) desc, o.created_at desc
  limit 1;

  insert into public.customers as c
    (shop_id, phone, email, name, address, orders_count, total_spent, first_order_at, last_order_at, updated_at)
  values
    (p_shop_id, p_phone, v_email, coalesce(v_name, ''), v_address, v_count, v_total, v_first, v_last, now())
  on conflict (shop_id, phone) do update set
    email = excluded.email,
    name = excluded.name,
    address = excluded.address,
    orders_count = excluded.orders_count,
    total_spent = excluded.total_spent,
    first_order_at = excluded.first_order_at,
    last_order_at = excluded.last_order_at,
    updated_at = now();
end;
$$;

-- Write-once email attach, callable by anyone holding the fresh order id
-- (guest flow: the buyer just placed it). Narrow by construction: only
-- within 2h of creation, only while unset, valid shape only.
create or replace function public.set_order_customer_email(p_order_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' or char_length(v_email) > 254 then
    raise exception 'invalid email' using errcode = '22023';
  end if;
  update public.orders
  set customer_email = v_email
  where id = p_order_id
    and customer_email is null
    and created_at > now() - interval '2 hours';
end;
$$;

revoke all on function public.set_order_customer_email(uuid, text) from public, anon;
grant execute on function public.set_order_customer_email(uuid, text) to anon, authenticated;

-- The 0092 sync trigger must also fire when the email is attached.
-- …and the sync function must treat an email change as a refresh reason.
create or replace function public.sync_customer_on_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.refresh_shop_customer(new.shop_id, new.customer_phone);
    return new;
  elsif tg_op = 'UPDATE' then
    perform public.refresh_shop_customer(old.shop_id, old.customer_phone);
    if new.shop_id is distinct from old.shop_id or new.customer_phone is distinct from old.customer_phone then
      perform public.refresh_shop_customer(new.shop_id, new.customer_phone);
    elsif new.status is distinct from old.status
      or new.total is distinct from old.total
      or new.customer_name is distinct from old.customer_name
      or new.customer_address is distinct from old.customer_address
      or new.customer_email is distinct from old.customer_email then
      perform public.refresh_shop_customer(new.shop_id, new.customer_phone);
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    perform public.refresh_shop_customer(old.shop_id, old.customer_phone);
    return old;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists orders_sync_customer on public.orders;
create trigger orders_sync_customer
  after insert or update of shop_id, customer_phone, customer_name, customer_address, customer_email, total, status
  or delete on public.orders
  for each row execute function public.sync_customer_on_order();

-- Self-read: a signed-in buyer sees only rows carrying their login email.
create policy "orders: customer self read" on public.orders
  for select using (
    customer_email is not null and customer_email = (auth.jwt() ->> 'email')
  );

create policy "order_items: customer self read" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.customer_email is not null
        and o.customer_email = (auth.jwt() ->> 'email')
    )
  );

create policy "customers: customer self read" on public.customers
  for select using (
    email is not null and lower(email) = lower((auth.jwt() ->> 'email'))
  );
