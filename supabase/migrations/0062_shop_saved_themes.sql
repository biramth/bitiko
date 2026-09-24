-- Personal saved themes: lets a merchant save the current design (global
-- theme + home + system template sections) as a named, reusable style of
-- their own — distinct from the four built-in per-vertical templates in
-- config/storeTemplates.ts. Duplicate/rename/delete/apply from the builder's
-- existing "Styles" tab, reusing its Explorer → Prévisualiser → Appliquer
-- flow by shaping a saved theme as a StoreTemplate client-side.

create table public.shop_saved_themes (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  theme_color text not null,
  theme_config jsonb not null,
  sections jsonb not null default '[]'::jsonb,
  templates jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shop_saved_themes enable row level security;

create policy "Owner manages saved themes"
  on public.shop_saved_themes for all
  using (shop_id in (select id from public.shops where owner_id = auth.uid()));

create index idx_shop_saved_themes_shop_id on public.shop_saved_themes(shop_id);
