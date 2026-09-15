-- Custom pages: lets merchants create additional storefront pages
-- (About, FAQ, Contact, landing pages, etc.) each with their own sections,
-- SEO metadata, and draft/publish lifecycle. Home page stays on shops.

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  title text not null,
  slug text not null,
  content jsonb not null default '[]'::jsonb,
  draft_content jsonb,
  seo_title text,
  seo_description text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, slug)
);

alter table public.pages enable row level security;

-- Owner (or shop admin) can fully manage their own pages
create policy "Owner manages pages"
  on public.pages for all
  using (shop_id in (select id from public.shops where owner_id = auth.uid()));

-- Published pages are readable by anyone (storefront visitors)
create policy "Published pages are public"
  on public.pages for select
  using (is_published = true);

create index idx_pages_shop_id on public.pages(shop_id);
create index idx_pages_published on public.pages(shop_id, slug) where is_published = true;