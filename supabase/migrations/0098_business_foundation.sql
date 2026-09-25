-- 0098_business_foundation.sql — PHASE-03 Database Foundation.
--
-- Introduces the business backbone WITHOUT touching anything existing:
--   business_types               — configurable business-type referential
--                                  (replaces the hardcoded src/config/verticals.ts
--                                  + shops.business_type TEXT over time, see PHASE-05)
--   capabilities                 — reusable technical capabilities (HAS_*)
--   business_type_capabilities   — which capabilities a business type needs
--
-- Design rules (see docs/refonte/PHASE-03-DESIGN.md):
-- - These are GLOBAL referentials: no tenant key, public read, platform-only
--   writes (same proven pattern as platform_members — no write policy, writes
--   go through service_role / migrations, never through anon/authenticated).
-- - New business data tables later key on activity_id, NEVER on shop_id as the
--   principal tenant. No activities table here (PHASE-04), no shops change,
--   no frontend change, no custom_domain resurrection.
-- - Extensibility: adding a business type or capability later is a plain
--   INSERT (Platform Admin, PHASE-05/14) — never a structural migration.
-- - Seed covers ONLY the 4 real legacy verticals (mode, epicerie, beaute,
--   tech — 1:1 with shops.business_type values). No speculative types.
--
-- Idempotent: IF NOT EXISTS + named constraints + ON CONFLICT DO NOTHING,
-- re-runnable. Rollback (dev only, tables have no dependents yet):
--   drop table if exists public.business_type_capabilities;
--   drop table if exists public.capabilities;
--   drop table if exists public.business_types;
--
-- 0. APPROVED cleanup preamble (decideur, 2026-09-25) : dev contained 5 rogue
--    prototype tables with NO migration file and NO history entry
--    (business_types x14 speculative rows, capabilities x23, junction x117,
--    organizations x0, memberships x0 - no code ever read them). They collide
--    with the validated design (speculative types refused, capability keyed
--    `code` not `slug`). Dropped here so this migration recreates the
--    validated shape from scratch. On databases without the prototype
--    (prod later) every DROP is a no-op via IF EXISTS.
drop table if exists
  public.business_type_capabilities,
  public.capabilities,
  public.business_types,
  public.memberships,
  public.organizations cascade;

create table if not exists public.business_types (
  id uuid primary key default gen_random_uuid(),
  -- Stable, immutable slug: the only identifier other layers may reference.
  slug text not null unique check (slug ~ '^[a-z0-9]+(_[a-z0-9]+)*$'),
  name text not null,
  description text,
  icon text,
  status text not null default 'active' check (status in ('active', 'deprecated', 'draft')),
  -- Future business parameters (durations, units, specific fields) live here
  -- as data (PHASE-05+), never as new columns per business type.
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.business_types is
  'Configurable business-type referential (coiffeur, restaurant, boutique…). Slug is stable and immutable; deprecated stays readable, draft is hidden.';
comment on column public.business_types.slug is
  'Stable machine key (e.g. mode, epicerie). Never rename once created — compat layers and seeds reference it.';

drop trigger if exists business_types_set_updated_at on public.business_types;
create trigger business_types_set_updated_at
  before update on public.business_types
  for each row execute function public.set_updated_at();

create table if not exists public.capabilities (
  id uuid primary key default gen_random_uuid(),
  -- Technical need code (e.g. HAS_APPOINTMENTS): what an activity can
  -- conceptually use. NOT an authorization (see entitlements, PHASE-10).
  code text not null unique check (code ~ '^HAS_[A-Z0-9_]+$'),
  label text not null,
  description text,
  -- Family grouping (commerce, catalogue, rendez-vous, equipe, …): drives
  -- BOTH workspace and (later, PHASE-07) frontstore adaptation.
  category text not null,
  status text not null default 'active' check (status in ('active', 'deprecated', 'draft')),
  created_at timestamptz not null default now()
);

comment on table public.capabilities is
  'Reusable technical capabilities. A capability states a business need, never an implementation nor a subscription allowance.';

create table if not exists public.business_type_capabilities (
  business_type_id uuid not null references public.business_types(id) on delete cascade,
  capability_id uuid not null references public.capabilities(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (business_type_id, capability_id)
);

create index if not exists business_type_capabilities_capability_idx
  on public.business_type_capabilities (capability_id);

alter table public.business_types enable row level security;
alter table public.capabilities enable row level security;
alter table public.business_type_capabilities enable row level security;

-- Public read: referentials carry no sensitive data (slugs, labels).
-- Deliberately NO write policy: writes are platform-only (service_role /
-- migrations), exactly like platform_members — users and businesses can
-- never modify referentials directly (validated PHASE-03 constraint #2).
drop policy if exists "business_types: public read" on public.business_types;
create policy "business_types: public read" on public.business_types
  for select using (true);

drop policy if exists "capabilities: public read" on public.capabilities;
create policy "capabilities: public read" on public.capabilities
  for select using (true);

drop policy if exists "business_type_capabilities: public read" on public.business_type_capabilities;
create policy "business_type_capabilities: public read" on public.business_type_capabilities
  for select using (true);

-- Seed: the 4 real legacy verticals ONLY (labels from src/config/verticals.ts).
insert into public.business_types (slug, name, description) values
  ('mode', 'Mode', 'Vêtements, accessoires, chaussures…'),
  ('epicerie', 'Épicerie', 'Alimentation, produits frais, essentiels du quotidien.'),
  ('beaute', 'Beauté', 'Cosmétiques, soins, parfums.'),
  ('tech', 'High-Tech', 'Électronique, téléphonie, électroménager.')
on conflict (slug) do nothing;

-- Seed: technical capabilities (~18). Extensible by INSERT, no DDL needed.
insert into public.capabilities (code, label, description, category) values
  ('HAS_SHOP', 'Boutique en ligne', 'L''activité vend via un shop (catalogue, panier, commande).', 'commerce'),
  ('HAS_PRODUCTS', 'Produits', 'Catalogue de produits avec prix et stock.', 'catalogue'),
  ('HAS_PRODUCT_VARIANTS', 'Variantes produit', 'Déclinaisons d''un produit (taille, couleur, modèle…).', 'catalogue'),
  ('HAS_SIZE_VARIANTS', 'Tailles', 'Variantes de taille avec guide éventuel.', 'catalogue'),
  ('HAS_COLOR_VARIANTS', 'Couleurs', 'Variantes de couleur.', 'catalogue'),
  ('HAS_COLLECTIONS', 'Collections', 'Regroupements de produits (collections, lookbook).', 'catalogue'),
  ('HAS_ORDERS', 'Commandes', 'Prise et suivi de commandes.', 'ventes'),
  ('HAS_CUSTOMERS', 'Clients', 'Fichier clients partagé de l''activité.', 'clients'),
  ('HAS_TEAM', 'Équipe', 'Membres, rôles et collaboration.', 'equipe'),
  ('HAS_APPOINTMENTS', 'Rendez-vous', 'Prise de rendez-vous par les clients.', 'rendez-vous'),
  ('HAS_SERVICES', 'Services / prestations', 'Catalogue de prestations avec durée et tarif.', 'rendez-vous'),
  ('HAS_CALENDAR', 'Calendrier', 'Planning et disponibilités.', 'rendez-vous'),
  ('HAS_RESERVATIONS', 'Réservations', 'Réservation de tables, places ou créneaux.', 'rendez-vous'),
  ('HAS_DELIVERY', 'Livraison', 'Zones, secteurs et frais de livraison.', 'livraison'),
  ('HAS_PREPARATION_TIME', 'Temps de préparation', 'Délai de préparation avant retrait/livraison.', 'ventes'),
  ('HAS_REVIEWS', 'Avis clients', 'Avis et témoignages affichables.', 'marketing'),
  ('HAS_ANALYTICS', 'Statistiques', 'Suivi d''activité et tableaux de bord.', 'pilotage'),
  ('HAS_PROMOTIONS', 'Promotions', 'Codes promo et offres.', 'marketing')
on conflict (code) do nothing;

-- Seed: legacy mappings (what each vertical effectively used until now).
insert into public.business_type_capabilities (business_type_id, capability_id)
select t.id, c.id
from public.business_types t
join public.capabilities c on c.code in (
  'HAS_SHOP', 'HAS_PRODUCTS', 'HAS_PRODUCT_VARIANTS', 'HAS_SIZE_VARIANTS',
  'HAS_COLOR_VARIANTS', 'HAS_COLLECTIONS', 'HAS_ORDERS', 'HAS_CUSTOMERS',
  'HAS_TEAM', 'HAS_REVIEWS', 'HAS_ANALYTICS', 'HAS_PROMOTIONS'
)
where t.slug = 'mode'
on conflict do nothing;

insert into public.business_type_capabilities (business_type_id, capability_id)
select t.id, c.id
from public.business_types t
join public.capabilities c on c.code in (
  'HAS_SHOP', 'HAS_PRODUCTS', 'HAS_ORDERS', 'HAS_CUSTOMERS',
  'HAS_DELIVERY', 'HAS_TEAM', 'HAS_ANALYTICS'
)
where t.slug = 'epicerie'
on conflict do nothing;

insert into public.business_type_capabilities (business_type_id, capability_id)
select t.id, c.id
from public.business_types t
join public.capabilities c on c.code in (
  'HAS_SHOP', 'HAS_PRODUCTS', 'HAS_ORDERS', 'HAS_CUSTOMERS',
  'HAS_APPOINTMENTS', 'HAS_SERVICES', 'HAS_REVIEWS', 'HAS_TEAM', 'HAS_ANALYTICS'
)
where t.slug = 'beaute'
on conflict do nothing;

insert into public.business_type_capabilities (business_type_id, capability_id)
select t.id, c.id
from public.business_types t
join public.capabilities c on c.code in (
  'HAS_SHOP', 'HAS_PRODUCTS', 'HAS_PRODUCT_VARIANTS', 'HAS_ORDERS',
  'HAS_CUSTOMERS', 'HAS_REVIEWS', 'HAS_TEAM', 'HAS_ANALYTICS'
)
where t.slug = 'tech'
on conflict do nothing;
