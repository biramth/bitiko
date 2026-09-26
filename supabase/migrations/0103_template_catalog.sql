-- 0103_template_catalog.sql — PHASE-08 Template system (DB catalog layer).
--
-- Catalog metadata for storefront templates (presentation identity only):
--   templates                — slug (= code template key), name, status
--   template_business_types  — which business types a template serves
--
-- The site CONTENT still lives in code (STORE_TEMPLATES) in this phase; the
-- catalog declares identity + compatibility so that Template ≠ Business Type:
-- adding a compatibility mapping (Platform Admin later, service-role now)
-- surfaces a template to another business type with zero code change.
-- Demo storefronts (live demo shops) and template versions arrive with the
-- gallery work (PHASE-08 follow-up) — not in this migration.
--
-- RLS: public read (no sensitive data), platform-only writes (proven pattern).
-- No existing object touched. Idempotent, re-runnable.

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  -- Stable key matching the code template (STORE_TEMPLATES key). Immutable.
  slug text not null unique check (slug ~ '^[a-z0-9]+(_[a-z0-9]+)*$'),
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'deprecated', 'draft')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.templates is
  'Template catalog (identity + compatibility). Site content stays in code for now; template versions and live demos are follow-ups. Slug immutable.';

drop trigger if exists templates_set_updated_at on public.templates;
create trigger templates_set_updated_at
  before update on public.templates
  for each row execute function public.set_updated_at();

create table if not exists public.template_business_types (
  template_id uuid not null references public.templates(id) on delete cascade,
  business_type_id uuid not null references public.business_types(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (template_id, business_type_id)
);

create index if not exists template_business_types_type_idx
  on public.template_business_types (business_type_id);

alter table public.templates enable row level security;
alter table public.template_business_types enable row level security;

drop policy if exists "templates: public read" on public.templates;
create policy "templates: public read" on public.templates
  for select using (true);

drop policy if exists "template_business_types: public read" on public.template_business_types;
create policy "template_business_types: public read" on public.template_business_types
  for select using (true);

-- Seed: the 4 genre templates, each serving its own vertical today.
-- Cross-type compatibility is added later without code change.
insert into public.templates (slug, name, description) values
  ('mode', 'Mode', 'Vitrine e-commerce pour vêtements et accessoires.'),
  ('epicerie', 'Épicerie', 'Vitrine e-commerce pour alimentation et essentiels.'),
  ('beaute', 'Beauté', 'Vitrine e-commerce pour cosmétiques et soins.'),
  ('tech', 'High-Tech', 'Vitrine e-commerce pour électronique et téléphonie.')
on conflict (slug) do nothing;

insert into public.template_business_types (template_id, business_type_id)
select t.id, b.id
from public.templates t
join public.business_types b on b.slug = t.slug
on conflict do nothing;

-- Template slugs compatible with a shop's effective business type (referential
-- first, legacy TEXT fallback — same rule as shop_business_type_slug()).
-- Returns [] when unknown: callers fall back to the legacy per-vertical list.
-- Drives the template picker (Template ≠ Business Type: a new mapping surfaces
-- a template to another type with zero code change).
create or replace function public.shop_template_slugs(p_shop_id uuid)
returns text[]
language sql
stable
set search_path = public
as $$
  with effective as (
    select coalesce(b.slug, s.business_type) as slug
    from public.shops s
    left join public.business_types b on b.id = s.business_type_id
    where s.id = p_shop_id
    limit 1
  )
  select coalesce(array_agg(t.slug order by t.slug), '{}')
  from effective e
  join public.business_types b on b.slug = e.slug and b.status = 'active'
  join public.template_business_types j on j.business_type_id = b.id
  join public.templates t on t.id = j.template_id and t.status = 'active'
$$;

comment on function public.shop_template_slugs(uuid) is
  'Template slugs compatible with a shop''s effective business type. Empty = caller falls back to legacy list.';

revoke all on function public.shop_template_slugs(uuid) from public;
grant execute on function public.shop_template_slugs(uuid) to anon, authenticated;
