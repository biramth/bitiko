-- 0106_usage_cost_foundation.sql — PHASE-12 Usage + Cost Engine (foundation).
--
-- Metering ledger + cost ledger. Deliberately NOT the full rating/overage/
-- advisor machinery (that needs prices in DB + dashboards — pricing follow-up
-- and PHASE-14): this lays the append-only, idempotent foundations and wires
-- ONE real source (campaign emails) to prove the loop.
--   usage_meters   — meter catalog (code, unit, category), public read
--   usage_records  — per-shop per-month counters, idempotent upsert via
--                    record_usage() (service-role only, like billing writes)
--   cost_records   — manual/admin cost entries (ingestion + dashboards in P14)
--
-- Units are real-world (messages, MB, runs…), never abstract credits.
-- RLS: meters public read; records owner read; costs locked (no policies).
-- No existing object touched. Idempotent, re-runnable.

create table if not exists public.usage_meters (
  code text primary key check (code ~ '^[a-z0-9_]+$'),
  name text not null,
  unit text not null,
  category text not null,
  status text not null default 'active' check (status in ('active', 'deprecated')),
  created_at timestamptz not null default now()
);

comment on table public.usage_meters is
  'Usage meter catalog (emails, storage_mb…). Real-world units only. Rating/quotas/overages build on top (pricing follow-up).';

create table if not exists public.usage_records (
  shop_id uuid not null references public.shops(id) on delete cascade,
  meter_code text not null references public.usage_meters(code),
  -- Month bucket (normalized to the 1st by record_usage()).
  period date not null,
  quantity numeric(14, 2) not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (shop_id, meter_code, period)
);

comment on table public.usage_records is
  'Per-shop per-month usage counters. Written only through record_usage() (idempotent add); append-only in spirit.';

create table if not exists public.cost_records (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in (
    'infrastructure', 'database', 'storage', 'cdn', 'api',
    'whatsapp', 'sms', 'email', 'ai', 'payment', 'support', 'domains', 'other'
  )),
  label text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'XOF',
  period date not null,
  source text not null default 'manual',
  notes text,
  created_at timestamptz not null default now()
);

comment on table public.cost_records is
  'Internal cost ledger (manual/admin entries for now; automated ingestion + dashboards in PHASE-14). Never exposed to merchants.';

create index if not exists cost_records_period_idx
  on public.cost_records (period desc, category);

alter table public.usage_meters enable row level security;
alter table public.usage_records enable row level security;
alter table public.cost_records enable row level security;

drop policy if exists "usage_meters: public read" on public.usage_meters;
create policy "usage_meters: public read" on public.usage_meters
  for select using (true);

drop policy if exists "usage_records: owner read" on public.usage_records;
create policy "usage_records: owner read" on public.usage_records
  for select using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

-- Idempotent adder: normalizes to month-start, validates shop + active meter.
-- Service-role only (revoked below): callers are server flows, never browsers.
create or replace function public.record_usage(p_shop_id uuid, p_meter text, p_qty numeric, p_period date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period date := date_trunc('month', p_period)::date;
begin
  if p_qty is null or p_qty <= 0 then
    return;
  end if;
  if not exists (select 1 from public.shops where id = p_shop_id) then
    raise exception 'unknown shop %', p_shop_id;
  end if;
  if not exists (select 1 from public.usage_meters where code = p_meter and status = 'active') then
    raise exception 'unknown or inactive meter %', p_meter;
  end if;
  insert into public.usage_records (shop_id, meter_code, period, quantity, updated_at)
  values (p_shop_id, p_meter, v_period, p_qty, now())
  on conflict (shop_id, meter_code, period)
  do update set quantity = public.usage_records.quantity + excluded.quantity, updated_at = now();
end;
$$;

revoke all on function public.record_usage(uuid, text, numeric, date) from public, anon, authenticated;

-- Seed: the resource catalog (units the business actually pays for).
insert into public.usage_meters (code, name, unit, category) values
  ('emails', 'Emails envoyés', 'message', 'communication'),
  ('whatsapp_messages', 'Messages WhatsApp', 'message', 'communication'),
  ('sms', 'SMS envoyés', 'message', 'communication'),
  ('storage_mb', 'Stockage fichiers', 'Mo', 'infrastructure'),
  ('ai_calls', 'Appels IA', 'appel', 'intelligence'),
  ('automation_runs', 'Exécutions automatisations', 'exécution', 'automatisation'),
  ('api_calls', 'Appels API', 'appel', 'infrastructure'),
  ('media_processed', 'Médias traités', 'fichier', 'infrastructure')
on conflict (code) do nothing;
