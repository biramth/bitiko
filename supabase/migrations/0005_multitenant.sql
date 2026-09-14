-- Turns the single shop into a real multi-tenant setup: every shop gets a
-- free subdomain (slug) and can later attach its own custom domain. Both
-- columns are how the frontend resolves "which shop is this visitor on"
-- from the request hostname (see src/lib/tenant.ts) — no change needed to
-- existing RLS policies since shops were already publicly readable.

alter table public.shops
  add column slug text,
  add column custom_domain text;

-- Backfill is not needed: this migration is applied before any shop rows
-- exist in a fresh multi-tenant deployment. If you already have a shop row
-- from the single-tenant phase, give it a slug manually before the NOT NULL
-- constraint below is enforced, e.g.:
--   update public.shops set slug = 'ma-boutique' where slug is null;

alter table public.shops
  alter column slug set not null;

alter table public.shops
  add constraint shops_slug_format check (slug ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$');

create unique index shops_slug_key on public.shops (lower(slug));
create unique index shops_custom_domain_key on public.shops (lower(custom_domain)) where custom_domain is not null;
