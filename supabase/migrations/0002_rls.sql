-- Row Level Security for every table. Nothing here is ever bypassed for
-- convenience: the owner is identified by auth.uid() = shops.owner_id, and
-- order writes are deliberately left with no anon/authenticated policy —
-- they only happen through the SECURITY DEFINER function in
-- 0003_create_order_function.sql.

alter table public.profiles enable row level security;
alter table public.shops enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- profiles: a user can only see and manage their own profile row.
create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles: insert own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);

-- shops: public read (storefront needs name/logo/whatsapp/currency for
-- anyone, including signed-out visitors); only the owner can write.
create policy "shops: public read" on public.shops
  for select using (true);

create policy "shops: owner insert" on public.shops
  for insert with check (auth.uid() = owner_id);

create policy "shops: owner update" on public.shops
  for update using (auth.uid() = owner_id);

create policy "shops: owner delete" on public.shops
  for delete using (auth.uid() = owner_id);

-- categories: public read; only the owning shop's owner can write.
create policy "categories: public read" on public.categories
  for select using (true);

create policy "categories: owner insert" on public.categories
  for insert with check (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

create policy "categories: owner update" on public.categories
  for update using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

create policy "categories: owner delete" on public.categories
  for delete using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

-- products: anonymous visitors only ever see active products; the owner
-- also sees their own inactive/out-of-stock products in the dashboard.
create policy "products: public read active" on public.products
  for select using (
    active = true
    or exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

create policy "products: owner insert" on public.products
  for insert with check (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

create policy "products: owner update" on public.products
  for update using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

create policy "products: owner delete" on public.products
  for delete using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

-- product_images: visible whenever the parent product is visible.
create policy "product_images: read with product" on public.product_images
  for select using (
    exists (
      select 1 from public.products p
      join public.shops s on s.id = p.shop_id
      where p.id = product_id
        and (p.active = true or s.owner_id = auth.uid())
    )
  );

create policy "product_images: owner insert" on public.product_images
  for insert with check (
    exists (
      select 1 from public.products p
      join public.shops s on s.id = p.shop_id
      where p.id = product_id and s.owner_id = auth.uid()
    )
  );

create policy "product_images: owner delete" on public.product_images
  for delete using (
    exists (
      select 1 from public.products p
      join public.shops s on s.id = p.shop_id
      where p.id = product_id and s.owner_id = auth.uid()
    )
  );

-- orders / order_items: intentionally NO insert policy for anon or
-- authenticated roles. Creation only happens through the create_order()
-- SECURITY DEFINER function, which validates stock/prices server-side.
-- The owner can read and update (status) their own shop's orders.
create policy "orders: owner read" on public.orders
  for select using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

create policy "orders: owner update status" on public.orders
  for update using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

create policy "order_items: owner read" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      join public.shops s on s.id = o.shop_id
      where o.id = order_id and s.owner_id = auth.uid()
    )
  );
