-- 0105_payment_engine.sql — PHASE-11 Payment Engine (Wave conservé, abstraction introduite).
--
-- Application → Payment Engine → Provider → Wave. Wave is requalified as the
-- TEMPORARY provider (legal/tech incomplete — see mission §34) and keeps working
-- EXACTLY as today: wave_payments + settle flow untouched. This migration only ADDS:
--   payment_providers      — provider catalog (wave/TEMPORARY seeded; Orange Money,
--                            aggregator… later, without touching billing)
--   payment_transactions   — provider-agnostic engine mirror (backfilled from
--                            wave_payments; new rows best-effort from the API layer)
--   payment_webhooks       — webhook receipt log (best-effort inserts)
--   payment_reconciliations— reconcile runs (writer arrives with monitoring)
--   provider_costs         — configurable provider costs (EMPTY: no invented rates)
--
-- RLS: providers public read; transactions owner read; webhooks/reconciliations/
-- costs service-role only (RLS enabled, no policies = locked via Data API).
-- No existing object touched. Idempotent, re-runnable.
--
-- 0. Rogue prototype cleanup (same class as 0098/0099/0104 preambles, dev drift
--    with NO migration file): an empty prototype `payment_providers` table with
--    an incompatible shape (no `code` column) collides below. No code reads it,
--    nothing references it. Dropped; no-op elsewhere via IF EXISTS.

drop table if exists public.payment_providers;

create table if not exists public.payment_providers (
  code text primary key check (code ~ '^[a-z0-9_]+$'),
  name text not null,
  -- temporary = current legal/tech reality (Wave); live = fully integrated.
  kind text not null check (kind in ('temporary', 'live')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.payment_providers is
  'Payment provider catalog. Wave is TEMPORARY until legal/tech allow full integration — never delete it without a replacement live provider.';

drop trigger if exists payment_providers_set_updated_at on public.payment_providers;
create trigger payment_providers_set_updated_at
  before update on public.payment_providers
  for each row execute function public.set_updated_at();

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  provider_code text not null references public.payment_providers(code),
  shop_id uuid not null references public.shops(id) on delete cascade,
  plan text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'XOF',
  client_reference text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'cancelled')),
  provider_ref text,
  provider_txn text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.payment_transactions is
  'Engine-level mirror of every payment attempt, whatever the provider. wave_payments stays the Wave system of record until a provider cutover (never silently).';

drop trigger if exists payment_transactions_set_updated_at on public.payment_transactions;
create trigger payment_transactions_set_updated_at
  before update on public.payment_transactions
  for each row execute function public.set_updated_at();

create index if not exists payment_transactions_shop_idx
  on public.payment_transactions (shop_id, created_at desc);

create table if not exists public.payment_webhooks (
  id uuid primary key default gen_random_uuid(),
  provider_code text not null references public.payment_providers(code),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  signature_valid boolean not null default false,
  processed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists payment_webhooks_provider_created_idx
  on public.payment_webhooks (provider_code, created_at desc);

create table if not exists public.payment_reconciliations (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.payment_transactions(id) on delete cascade,
  matches boolean not null,
  details jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now()
);

create table if not exists public.provider_costs (
  provider_code text not null references public.payment_providers(code) on delete cascade,
  kind text not null check (kind in ('commission', 'transaction', 'payout', 'fx', 'refund')),
  rate numeric check (rate is null or rate >= 0),
  fixed_amount numeric(12, 2) check (fixed_amount is null or fixed_amount >= 0),
  currency text not null default 'XOF',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (provider_code, kind)
);

comment on table public.provider_costs is
  'Configurable provider economics (commission, fees, FX…). Deliberately EMPTY: rates are business data, never invented in a migration.';

drop trigger if exists provider_costs_set_updated_at on public.provider_costs;
create trigger provider_costs_set_updated_at
  before update on public.provider_costs
  for each row execute function public.set_updated_at();

alter table public.payment_providers enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.payment_webhooks enable row level security;
alter table public.payment_reconciliations enable row level security;
alter table public.provider_costs enable row level security;

drop policy if exists "payment_providers: public read" on public.payment_providers;
create policy "payment_providers: public read" on public.payment_providers
  for select using (true);

drop policy if exists "payment_transactions: owner read" on public.payment_transactions;
create policy "payment_transactions: owner read" on public.payment_transactions
  for select using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

-- Seed: Wave as the TEMPORARY provider (current reality, mission §34).
insert into public.payment_providers (code, name, kind, status, config)
values ('wave', 'Wave', 'temporary', 'active', '{"note": "Wave Business Checkout — integration temporaire en attendant la structuration officielle"}'::jsonb)
on conflict (code) do nothing;

-- Backfill engine mirror from the Wave system of record (idempotent).
insert into public.payment_transactions
  (provider_code, shop_id, plan, amount, currency, client_reference, status, provider_ref, provider_txn, completed_at)
select
  'wave', shop_id, plan, amount, currency, client_reference, status,
  wave_checkout_id, wave_transaction_id, completed_at
from public.wave_payments
on conflict (client_reference) do nothing;
