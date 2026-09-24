-- Team read/write (Pro feature, see 0093_shop_members.sql): managers act like
-- the owner except on shop settings/billing/team (owner-only, unchanged);
-- vendeurs read everything and advance order statuses. All additive — no
-- existing policy is touched, RLS ORs them.
-- NOTE: no delivery_zones block — that table was dropped by 0010 (replaced
-- by delivery_secteurs/villes). Every statement below is drop-if-exists
-- guarded so a half-applied run can simply be re-executed.
-- Tables keyed directly by shop_id.
drop policy if exists "categories: manager write" on public.categories;
create policy "categories: manager write" on public.categories
  for all using (public.shop_role(shop_id) = 'manager')
  with check (public.shop_role(shop_id) = 'manager');

drop policy if exists "products: manager write" on public.products;
create policy "products: manager write" on public.products
  for all using (public.shop_role(shop_id) = 'manager')
  with check (public.shop_role(shop_id) = 'manager');

drop policy if exists "delivery_secteurs: manager write" on public.delivery_secteurs;
create policy "delivery_secteurs: manager write" on public.delivery_secteurs
  for all using (public.shop_role(shop_id) = 'manager')
  with check (public.shop_role(shop_id) = 'manager');

drop policy if exists "delivery_villes: manager write" on public.delivery_villes;
create policy "delivery_villes: manager write" on public.delivery_villes
  for all using (public.shop_role(shop_id) = 'manager')
  with check (public.shop_role(shop_id) = 'manager');

drop policy if exists "Manager manages pages" on public.pages;
create policy "Manager manages pages" on public.pages
  for all using (
    shop_id in (
      select m.shop_id from public.shop_members m
      where m.user_id = auth.uid() and m.role = 'manager'
    )
  );

drop policy if exists "customers: manager update" on public.customers;
create policy "customers: manager update" on public.customers
  for update using (public.shop_role(shop_id) = 'manager');

drop policy if exists "orders: team read" on public.orders;
create policy "orders: team read" on public.orders
  for select using (public.shop_role(shop_id) in ('manager', 'vendeur'));

drop policy if exists "orders: team advance status" on public.orders;
create policy "orders: team advance status" on public.orders
  for update using (public.shop_role(shop_id) in ('manager', 'vendeur'));

-- Tables keyed through a parent row.
drop policy if exists "product_images: manager write" on public.product_images;
create policy "product_images: manager write" on public.product_images
  for all using (
    exists (
      select 1 from public.products p
      where p.id = product_id and public.shop_role(p.shop_id) = 'manager'
    )
  ) with check (
    exists (
      select 1 from public.products p
      where p.id = product_id and public.shop_role(p.shop_id) = 'manager'
    )
  );

drop policy if exists "product_variants: manager write" on public.product_variants;
create policy "product_variants: manager write" on public.product_variants
  for all using (
    exists (
      select 1 from public.products p
      where p.id = product_id and public.shop_role(p.shop_id) = 'manager'
    )
  ) with check (
    exists (
      select 1 from public.products p
      where p.id = product_id and public.shop_role(p.shop_id) = 'manager'
    )
  );

drop policy if exists "order_items: team read" on public.order_items;
create policy "order_items: team read" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and public.shop_role(o.shop_id) in ('manager', 'vendeur')
    )
  );

drop policy if exists "customers: team read" on public.customers;
create policy "customers: team read" on public.customers
  for select using (public.shop_role(shop_id) in ('manager', 'vendeur'));
