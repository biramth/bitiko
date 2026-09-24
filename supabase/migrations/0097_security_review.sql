-- Pre-merge security review fixes (develop -> main).
--
-- 1. set_order_status / set_order_delivery_fee resolved "the caller's shop"
--    as their FIRST OWNED shop: team members got 'not authorized' on every
--    call (the app advances statuses through these RPCs, so the vendeur role
--    was dead), and multi-shop owners got 'order not found' on shops 2+.
--    Both now resolve the ORDER's shop and check the caller's role on it.
-- 2. Team uploads were RLS-denied: storage policies were owner-only, so a
--    manager's product/category/logo uploads 403'd. Manager mirrors added.
-- 3. No cap on shops per owner: with multi-shop onboarding, one account
--    could spin unlimited (free) shops. Hard cap of 5 per owner.
-- 4. Invite claim compared emails case-sensitively; auth emails may differ
--    in case from the invite. Both sides lowercased now.
-- 5. count_custom_sections gets an explicit search_path (advisor WARN).
-- 6. Missing index on shops(owner_id) (advisor INFO; getMyShops filters it).

-- 0092's trigger helpers are SECURITY DEFINER without any revoke: any
-- signed-in (or anonymous) caller could execute them directly. They only
-- recompute aggregates deterministically from orders (no arbitrary writes
-- possible), but least-privilege says lock them to trigger-internal use.
revoke all on function public.refresh_shop_customer(uuid, text) from public, anon;
revoke all on function public.sync_customer_on_order() from public, anon;

-- 1a. set_order_status: owner/manager/vendeur of the order's shop.
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

  if not exists (select 1 from public.orders where id = p_order_id) then
    raise exception 'order not found';
  end if;

  select o.shop_id into v_shop_id
  from public.orders o
  where o.id = p_order_id
    and public.shop_role(o.shop_id) in ('owner', 'manager', 'vendeur');

  if v_shop_id is null then
    raise exception 'not authorized';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

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

-- 1b. set_order_delivery_fee: money-adjacent, owner/manager only (vendeur
-- excluded — same line as the rest of the team matrix).
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

-- 2. Manager mirrors on the storage buckets (same path conventions as the
-- owner policies in 0004/0022 — product/category images resolve the shop
-- through their parent row, shop-assets through the path's first folder).
create policy "product-images: manager insert" on storage.objects
  for insert with check (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.products p
      where p.id::text = (storage.foldername(storage.objects.name))[1]
        and public.shop_role(p.shop_id) = 'manager'
    )
  );

create policy "product-images: manager delete" on storage.objects
  for delete using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.products p
      where p.id::text = (storage.foldername(storage.objects.name))[1]
        and public.shop_role(p.shop_id) = 'manager'
    )
  );

create policy "category-images: manager insert" on storage.objects
  for insert with check (
    bucket_id = 'category-images'
    and exists (
      select 1 from public.categories c
      where c.id::text = (storage.foldername(storage.objects.name))[1]
        and public.shop_role(c.shop_id) = 'manager'
    )
  );

create policy "category-images: manager delete" on storage.objects
  for delete using (
    bucket_id = 'category-images'
    and exists (
      select 1 from public.categories c
      where c.id::text = (storage.foldername(storage.objects.name))[1]
        and public.shop_role(c.shop_id) = 'manager'
    )
  );

create policy "shop-assets: manager write" on storage.objects
  for all using (
    bucket_id = 'shop-assets'
    and exists (
      select 1 from public.shops s
      where s.id::text = (storage.foldername(storage.objects.name))[1]
        and public.shop_role(s.id) = 'manager'
    )
  ) with check (
    bucket_id = 'shop-assets'
    and exists (
      select 1 from public.shops s
      where s.id::text = (storage.foldername(storage.objects.name))[1]
        and public.shop_role(s.id) = 'manager'
    )
  );

-- 3. Cap: 5 shops max per owner (abuse guard now that onboarding can mint
-- more than one; subscriptions stay per-shop as before).
create or replace function public.enforce_max_shops_per_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  select count(*)::integer into v_count
  from public.shops
  where owner_id = new.owner_id;
  if v_count >= 5 then
    raise exception 'shop_limit_reached: un compte peut posséder au maximum 5 boutiques'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_max_shops_per_owner() from public, anon;

drop trigger if exists shops_enforce_max_shops on public.shops;
create trigger shops_enforce_max_shops
  before insert on public.shops
  for each row execute function public.enforce_max_shops_per_owner();

-- 4. Case-insensitive invite claim (both the RPC and its RLS policy).
create or replace function public.claim_shop_invites()
returns setof uuid
language sql
security definer
set search_path = public
as $$
  update public.shop_members
  set user_id = auth.uid(), accepted_at = coalesce(accepted_at, now())
  where user_id is null and lower(email) = lower((auth.jwt() ->> 'email'))
  returning shop_id;
$$;

drop policy if exists "shop_members: claim own invite" on public.shop_members;
create policy "shop_members: claim own invite" on public.shop_members
  for update using (
    user_id is null and lower(email) = lower((auth.jwt() ->> 'email'))
  ) with check (
    user_id = auth.uid() and lower(email) = lower((auth.jwt() ->> 'email'))
  );

-- 5. Explicit search_path (was relying on the caller's).
create or replace function public.count_custom_sections(p_sections jsonb)
returns integer
language sql
immutable
set search_path = public
as $$
  select count(*)::integer
  from jsonb_array_elements(coalesce(p_sections, '[]'::jsonb)) as section
  where section->>'type' in ('hero', 'text', 'image', 'promo', 'faq', 'lookbook', 'flexible', 'testimonials');
$$;

-- 6. Index backing getMyShops' owner filter.
create index if not exists shops_owner_id_idx on public.shops (owner_id);
