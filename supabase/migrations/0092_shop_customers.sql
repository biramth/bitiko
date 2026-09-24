-- CRM V1: one row per real customer (shop + canonical phone), maintained
-- automatically from orders — the merchant never edits this table's
-- lifecycle by hand. Cancelled orders don't count toward spend/count (a
-- fully-cancelled customer disappears), so aggregates are recomputed from
-- the orders table on every write rather than incrementally summed — always
-- correct across status flips, phone edits and backfills.
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  -- Canonical "+221XXXXXXXXX" (orders.customer_phone is already normalized
  -- by 0063's BEFORE trigger, which fires before the AFTER trigger below).
  phone text not null,
  name text not null default '',
  address text null,
  orders_count integer not null default 0 check (orders_count >= 0),
  total_spent numeric(12, 2) not null default 0 check (total_spent >= 0),
  first_order_at timestamptz null,
  last_order_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, phone)
);

create index customers_shop_activity_idx on public.customers (shop_id, last_order_at desc);

alter table public.customers enable row level security;

-- Reads + name/address corrections for the shop owner. Inserts/deletes are
-- intentionally owner-forbidden: the sync trigger below owns the lifecycle.
create policy "customers: owner read" on public.customers
  for select using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

create policy "customers: owner update" on public.customers
  for update using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

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

  select o.customer_name, o.customer_address into v_name, v_address
  from public.orders o
  where o.shop_id = p_shop_id
    and o.customer_phone = p_phone
    and o.status <> 'cancelled'
  order by o.created_at desc
  limit 1;

  insert into public.customers as c
    (shop_id, phone, name, address, orders_count, total_spent, first_order_at, last_order_at, updated_at)
  values
    (p_shop_id, p_phone, coalesce(v_name, ''), v_address, v_count, v_total, v_first, v_last, now())
  on conflict (shop_id, phone) do update set
    name = excluded.name,
    address = excluded.address,
    orders_count = excluded.orders_count,
    total_spent = excluded.total_spent,
    first_order_at = excluded.first_order_at,
    last_order_at = excluded.last_order_at,
    updated_at = now();
end;
$$;

revoke all on function public.refresh_shop_customer(uuid, text) from public, anon;

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
      or new.customer_address is distinct from old.customer_address then
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

revoke all on function public.sync_customer_on_order() from public, anon;

drop trigger if exists orders_sync_customer on public.orders;
create trigger orders_sync_customer
  after insert or update of shop_id, customer_phone, customer_name, customer_address, total, status
  or delete on public.orders
  for each row execute function public.sync_customer_on_order();

-- Backfill: one refresh per existing (shop, phone) pair, each in its own
-- savepoint so a single bad row can't abort the migration.
do $$
declare
  r record;
begin
  for r in select distinct shop_id, customer_phone as phone from public.orders loop
    begin
      perform public.refresh_shop_customer(r.shop_id, r.phone);
    exception when others then
      raise notice 'customers backfill: could not refresh shop % phone % — left untouched', r.shop_id, r.phone;
    end;
  end loop;
end $$;
