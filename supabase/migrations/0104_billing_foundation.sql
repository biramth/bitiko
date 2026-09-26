-- 0104_billing_foundation.sql — PHASE-10 Billing + Entitlements (DB foundation).
--
-- Makes the DATABASE the single source of plan truth (fixes the live drift:
-- plans.ts promised free shops 15 active products while plan_max_active_products
-- enforced 8 — the trigger always won, the UI lied):
--   plans                — plan catalog (free/essential/pro; prices stay in
--                          code for now — business decision, see below)
--   plan_entitlements    — boolean gates per plan (HAS_CUSTOM_DOMAIN…)
--   plan_limits          — numeric caps per plan (MAX_ACTIVE_PRODUCTS…,
--                          NULL = unlimited)
--   subscriptions        — per-shop subscription mirror (authoritative long-term;
--                          shop_subscriptions kept as-is, compat)
--   subscription_history — append-only plan-change log
--
-- The plan_max_*() functions now READ plan_limits (same values as before —
-- behavior identical, source unified). Triggers calling them are untouched.
-- Prices (priceXof 0/3000/10000) deliberately NOT moved: changing prices is a
-- business decision (mission hypotheses differ: 4900/14900) — plan_prices,
-- country pricing and invoices arrive in the billing follow-up (PHASE-12 area),
-- as do usage meters/quotas/overages.
--
-- RLS: plans/entitlements/limits public read, no writes; subscriptions/history
-- owner read, no writes (service-role writes, proven billing pattern).
-- No frontend change in this migration (plans.ts alignment is a code commit).
-- Idempotent, re-runnable.
--
-- 0. Rogue prototype cleanup (same class as 0098/0099 preambles, dev drift with
--    NO migration file): a prototype `plans` table (4 speculative rows, depended on
--    only by the equally-rogue `country_prices` — no code reads either) collides
--    with the validated `plans` below. Both dropped (CASCADE takes the dependent);
--    country_prices is properly rebuilt in the pricing work (PHASE-12 area).
--    No-op on databases without the prototype (prod later) via IF EXISTS.

drop table if exists public.plans, public.country_prices cascade;

create table if not exists public.plans (
  key text primary key check (key ~ '^[a-z0-9_]+$'),
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'deprecated', 'draft')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.plans is
  'Plan catalog. Prices intentionally NOT stored here yet (business decision pending) — see module header.';

drop trigger if exists plans_set_updated_at on public.plans;
create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

create table if not exists public.plan_entitlements (
  plan_key text not null references public.plans(key),
  code text not null check (code ~ '^HAS_[A-Z0-9_]+$'),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (plan_key, code)
);

comment on table public.plan_entitlements is
  'Boolean gates per plan (e.g. HAS_CUSTOM_DOMAIN). Capability (business need) vs entitlement (subscription allowance) stay separate.';

create table if not exists public.plan_limits (
  plan_key text not null references public.plans(key),
  code text not null check (code ~ '^MAX_[A-Z0-9_]+$'),
  -- NULL = unlimited (mirrors the null convention of plan_max_*()).
  max_value integer check (max_value is null or max_value >= 0),
  created_at timestamptz not null default now(),
  primary key (plan_key, code)
);

comment on table public.plan_limits is
  'Numeric caps per plan, read by plan_max_*(). Single source of truth for limits.';

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null unique references public.shops(id) on delete cascade,
  plan_key text not null references public.plans(key),
  status text not null default 'active' check (status in ('active', 'past_due', 'cancelled')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.subscriptions is
  'Per-shop subscription (long-term authoritative; mirrors shop_subscriptions, kept as compat). Writes are service-role only.';

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create table if not exists public.subscription_history (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  from_plan text,
  to_plan text not null,
  reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.subscription_history is
  'Append-only plan-change log. No update/delete path by design.';

create index if not exists subscription_history_subscription_idx
  on public.subscription_history (subscription_id, created_at desc);

alter table public.plans enable row level security;
alter table public.plan_entitlements enable row level security;
alter table public.plan_limits enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_history enable row level security;

drop policy if exists "plans: public read" on public.plans;
create policy "plans: public read" on public.plans
  for select using (true);

drop policy if exists "plan_entitlements: public read" on public.plan_entitlements;
create policy "plan_entitlements: public read" on public.plan_entitlements
  for select using (true);

drop policy if exists "plan_limits: public read" on public.plan_limits;
create policy "plan_limits: public read" on public.plan_limits
  for select using (true);

drop policy if exists "subscriptions: owner read" on public.subscriptions;
create policy "subscriptions: owner read" on public.subscriptions
  for select using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

drop policy if exists "subscription_history: owner read" on public.subscription_history;
create policy "subscription_history: owner read" on public.subscription_history
  for select using (
    exists (
      select 1 from public.subscriptions sub
      join public.shops s on s.id = sub.shop_id
      where sub.id = subscription_id and s.owner_id = auth.uid()
    )
  );

-- Seed: the 3 real plans (names from src/config/plans.ts).
insert into public.plans (key, name, description, sort_order) values
  ('free', 'Découverte', 'Pour découvrir Bitiko.', 0),
  ('essential', 'Essentiel', 'Pour vendre sérieusement.', 1),
  ('pro', 'Pro', 'Pour développer son activité.', 2)
on conflict (key) do nothing;

-- Seed: limits mirror the enforced DB truth (the values triggers already apply).
insert into public.plan_limits (plan_key, code, max_value) values
  ('free', 'MAX_ACTIVE_PRODUCTS', 8),
  ('essential', 'MAX_ACTIVE_PRODUCTS', 50),
  ('pro', 'MAX_ACTIVE_PRODUCTS', null),
  ('free', 'MAX_CUSTOM_PAGES', 1),
  ('essential', 'MAX_CUSTOM_PAGES', 5),
  ('pro', 'MAX_CUSTOM_PAGES', null),
  ('free', 'MAX_CUSTOM_SECTIONS', 3),
  ('essential', 'MAX_CUSTOM_SECTIONS', 10),
  ('pro', 'MAX_CUSTOM_SECTIONS', null),
  ('free', 'MAX_PRODUCT_IMAGES', 4),
  ('essential', 'MAX_PRODUCT_IMAGES', null),
  ('pro', 'MAX_PRODUCT_IMAGES', null),
  ('free', 'MAX_VARIANTS', 2),
  ('essential', 'MAX_VARIANTS', null),
  ('pro', 'MAX_VARIANTS', null)
on conflict do nothing;

-- Seed: boolean gates mirroring Plan.teamAccess (+ branding/builder flags the
-- frontend already reads from plans.ts — centralized here for PHASE-10 wiring).
insert into public.plan_entitlements (plan_key, code, enabled) values
  ('free', 'HAS_TEAM_ACCESS', false),
  ('essential', 'HAS_TEAM_ACCESS', false),
  ('pro', 'HAS_TEAM_ACCESS', true),
  ('free', 'HAS_CUSTOM_DOMAIN', false),
  ('essential', 'HAS_CUSTOM_DOMAIN', true),
  ('pro', 'HAS_CUSTOM_DOMAIN', true),
  ('free', 'HAS_REMOVABLE_BRANDING', false),
  ('essential', 'HAS_REMOVABLE_BRANDING', false),
  ('pro', 'HAS_REMOVABLE_BRANDING', true),
  ('free', 'HAS_ADVANCED_BUILDER', false),
  ('essential', 'HAS_ADVANCED_BUILDER', true),
  ('pro', 'HAS_ADVANCED_BUILDER', true)
on conflict do nothing;

-- Backfill subscriptions mirror (idempotent; no-op on empty databases).
insert into public.subscriptions (shop_id, plan_key, status, current_period_end)
select s.shop_id, s.plan, s.status, s.current_period_end
from public.shop_subscriptions s
on conflict (shop_id) do nothing;

-- Single source: plan_max_*() now read plan_limits, with the historic hardcoded
-- values as fallback (identical behavior when rows exist — which the seed above
-- guarantees; fallback only protects partially-seeded databases).
create or replace function public.plan_max_active_products(p_plan text)
returns integer
language sql
stable
set search_path = public
as $$
  select coalesce(
    (select max_value from public.plan_limits where plan_key = p_plan and code = 'MAX_ACTIVE_PRODUCTS'),
    case p_plan when 'essential' then 50 when 'pro' then null else 8 end
  );
$$;

create or replace function public.plan_max_custom_pages(p_plan text)
returns integer
language sql
stable
set search_path = public
as $$
  select coalesce(
    (select max_value from public.plan_limits where plan_key = p_plan and code = 'MAX_CUSTOM_PAGES'),
    case p_plan when 'essential' then 5 when 'pro' then null else 1 end
  );
$$;

create or replace function public.plan_max_custom_sections(p_plan text)
returns integer
language sql
stable
set search_path = public
as $$
  select coalesce(
    (select max_value from public.plan_limits where plan_key = p_plan and code = 'MAX_CUSTOM_SECTIONS'),
    case p_plan when 'essential' then 10 when 'pro' then null else 3 end
  );
$$;

create or replace function public.plan_max_product_images(p_plan text)
returns integer
language sql
stable
set search_path = public
as $$
  select coalesce(
    (select max_value from public.plan_limits where plan_key = p_plan and code = 'MAX_PRODUCT_IMAGES'),
    case p_plan when 'essential' then null when 'pro' then null else 4 end
  );
$$;

create or replace function public.plan_max_variants(p_plan text)
returns integer
language sql
stable
set search_path = public
as $$
  select coalesce(
    (select max_value from public.plan_limits where plan_key = p_plan and code = 'MAX_VARIANTS'),
    case p_plan when 'essential' then null when 'pro' then null else 2 end
  );
$$;

-- Table-reading helpers stay trigger-internal: no direct RPC access.
revoke execute on function public.plan_max_active_products(text) from public, anon, authenticated;
revoke execute on function public.plan_max_custom_pages(text) from public, anon, authenticated;
revoke execute on function public.plan_max_custom_sections(text) from public, anon, authenticated;
revoke execute on function public.plan_max_product_images(text) from public, anon, authenticated;
revoke execute on function public.plan_max_variants(text) from public, anon, authenticated;
