-- Extensions
create extension if not exists "pgcrypto";

-- Generic trigger to keep updated_at current
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- profiles: one row per auth user, holds the app role
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin')),
  created_at timestamptz not null default now()
);

-- shops: structured with an owner + shop_id everywhere so the schema can
-- support more than one shop later without reshaping tables.
create table public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  logo_url text,
  whatsapp_number text not null,
  currency text not null default 'XOF',
  address text,
  social_links jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger shops_set_updated_at
  before update on public.shops
  for each row execute function public.set_updated_at();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  unique (shop_id, slug)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  -- restrict (not cascade/set null) so a category with products cannot be
  -- deleted silently — the app surfaces this and asks to reassign first.
  category_id uuid references public.categories(id) on delete restrict,
  name text not null,
  slug text not null,
  description text,
  price numeric(12, 2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, slug)
);

create index products_shop_active_idx on public.products (shop_id, active);
create index products_category_idx on public.products (category_id);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index product_images_product_idx on public.product_images (product_id, sort_order);

-- Order numbers look like CMD-1000, CMD-1001, ...
create sequence public.order_number_seq start 1000;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  order_number text not null unique,
  customer_name text not null,
  customer_phone text not null,
  total numeric(12, 2) not null check (total >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'paid', 'cancelled', 'delivered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_shop_created_idx on public.orders (shop_id, created_at desc);
create index orders_shop_status_idx on public.orders (shop_id, status);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- order_items snapshots product_name/unit_price at order time so the order
-- history stays accurate even if the product is later renamed, repriced,
-- or deleted (product_id is nullable and set null on delete for that reason).
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  subtotal numeric(12, 2) not null check (subtotal >= 0)
);

create index order_items_order_idx on public.order_items (order_id);
