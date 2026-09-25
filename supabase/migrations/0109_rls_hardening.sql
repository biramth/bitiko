-- 0109_rls_hardening.sql — PHASE-15 Performance + Security hardening (RLS batch).
--
-- Closes the WITH CHECK gaps inventoried in PHASE-01 §3.1 (all verified
-- effective before this change): an UPDATE policy WITHOUT WITH CHECK lets the
-- caller rewrite the row's tenant key (owner_id/shop_id) — e.g. a manager
-- could reassign a shop's owner or move pages/customers across shops.
-- Plus a column-scope trigger on orders: team members may advance the STATUS
-- (their job) but RLS alone cannot stop them rewriting total/customer data —
-- only a trigger can. Owners bypass it (their own data); updated_at churn
-- from set_updated_at() is ignored.
--
-- Behavior changes (intended, dev-only): manager/vendeur writes outside their
-- scope now fail instead of silently succeeding. No owner flow changes.
-- Idempotent (drop-if-exists + create), re-runnable.

-- shops: owner update — cannot transfer ownership or retarget the row.
drop policy if exists "shops: owner update" on public.shops;
create policy "shops: owner update" on public.shops
  for update using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- shops: manager update (day-to-day settings, see 0096) — cannot change
-- owner_id, slug, or organization_id out from under the owner.
drop policy if exists "shops: manager update" on public.shops;
create policy "shops: manager update" on public.shops
  for update using (public.shop_role(id) = 'manager')
  with check (public.shop_role(id) = 'manager');

-- orders: team advance status — same role on write as on read.
drop policy if exists "orders: team advance status" on public.orders;
create policy "orders: team advance status" on public.orders
  for update using (public.shop_role(shop_id) in ('manager', 'vendeur'))
  with check (public.shop_role(shop_id) in ('manager', 'vendeur'));

-- Column scope: non-owners may only touch status (+ updated_at churn).
-- Bypassed for trusted server paths, detected WITHOUT relying on roles:
-- set_order_delivery_fee() sets a transaction-local flag before its update
-- (raw Data-API callers cannot set GUCs). service_role writes bypass RLS
-- entirely (auth.uid() is null → shop_role() null → allowed below), which the
-- backoffice admin flows rely on.
create or replace function public.enforce_order_update_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if current_setting('bitiko.trusted_order_write', true) = '1' then
    return new;
  end if;
  v_role := public.shop_role(old.shop_id);
  if v_role = 'owner' or v_role is null then
    return new;
  end if;
  -- manager/vendeur may change status and nothing else (updated_at ignored).
  if new.customer_name is distinct from old.customer_name
    or new.customer_phone is distinct from old.customer_phone
    or new.customer_address is distinct from old.customer_address
    or new.customer_email is distinct from old.customer_email
    or new.total is distinct from old.total
    or new.delivery_fee is distinct from old.delivery_fee
    or new.shop_id is distinct from old.shop_id
    or new.order_number is distinct from old.order_number then
    raise exception 'order_update_denied: team members may only advance the order status'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_order_update_scope() from public, anon, authenticated;

drop trigger if exists orders_enforce_update_scope on public.orders;
create trigger orders_enforce_update_scope
  before update on public.orders
  for each row execute function public.enforce_order_update_scope();

-- set_order_delivery_fee() is the one legitimate non-status writer (owner /
-- manager via RPC): it raises the trusted-write flag for its transaction.
-- Body identical to 0097_security_review.sql plus the single set_config line.
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
  perform set_config('bitiko.trusted_order_write', '1', true);
  if p_fee is null or p_fee < 0 then
    raise exception 'invalid delivery fee';
  end if;

  if not exists (select 1 from public.orders where id = p_order_id) then
    raise exception 'order not found';
  end if;

  select o.shop_id into v_shop_id
  from public.orders o
  where o.id = p_order_id
    and public.shop_role(o.shop_id) in ('owner', 'manager');

  if v_shop_id is null then
    raise exception 'not authorized';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

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

-- pages: manager cannot move pages across shops.
drop policy if exists "Manager manages pages" on public.pages;
create policy "Manager manages pages" on public.pages
  for all using (
    shop_id in (
      select m.shop_id from public.shop_members m
      where m.user_id = auth.uid() and m.role = 'manager'
    )
  )
  with check (
    shop_id in (
      select m.shop_id from public.shop_members m
      where m.user_id = auth.uid() and m.role = 'manager'
    )
  );

-- customers: manager cannot move customers across shops.
drop policy if exists "customers: manager update" on public.customers;
create policy "customers: manager update" on public.customers
  for update using (public.shop_role(shop_id) = 'manager')
  with check (public.shop_role(shop_id) = 'manager');
