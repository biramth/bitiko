-- 0107_automation_foundation.sql — PHASE-13 Automation Engine (foundation).
--
-- Business Event → (engine) → Channel. This migration lays the journal and the
-- rule/run ledgers; the dispatcher lives in api/cron/automation-dispatch.ts.
--   business_events    — ordered, replayable domain facts (ORDER_CREATED…),
--                        emitted by the domain, never by channels
--   automation_rules   — per-shop rules (event → channel + template), disabled
--                        by default: zero behavior change until rules exist
--   automation_runs    — every evaluation traced (sent/failed/skipped)
--
-- Emission: AFTER trigger on orders (INSERT → ORDER_CREATED; status UPDATE →
-- ORDER_<STATUS>) with an EXCEPTION guard — the journal must NEVER break the
-- business write it observes. More emitters (appointments…) arrive with their
-- domains; channels (WhatsApp/SMS/push) arrive with their providers — email
-- first (existing Resend infra).
--
-- RLS: owner read on all three (via shops), no client writes (service writes).
-- No existing object touched (new trigger only). Idempotent, re-runnable.

create table if not exists public.business_events (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  type text not null check (type ~ '^[A-Z0-9_]+$'),
  payload jsonb not null default '{}'::jsonb,
  processed boolean not null default false,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.business_events is
  'Ordered domain-event journal (ORDER_CREATED…). Free-text types (no enum migration per event); replayable via processed flag.';

create index if not exists business_events_unprocessed_idx
  on public.business_events (processed, occurred_at) where processed = false;
create index if not exists business_events_shop_idx
  on public.business_events (shop_id, occurred_at desc);

create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  event_type text not null check (event_type ~ '^[A-Z0-9_]+$'),
  channel text not null check (channel in ('log', 'email', 'whatsapp', 'sms', 'push')),
  -- Channel template: { subject, body } with {{variables}} (order_number…).
  -- whatsapp/sms/push rules stay dormant until their adapters exist.
  template jsonb not null default '{}'::jsonb,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.automation_rules is
  'Per-shop automation rules. Disabled by default: creating the tables changes nothing until rules are enabled (management UI in PHASE-14).';

drop trigger if exists automation_rules_set_updated_at on public.automation_rules;
create trigger automation_rules_set_updated_at
  before update on public.automation_rules
  for each row execute function public.set_updated_at();

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.automation_rules(id) on delete cascade,
  event_id uuid not null references public.business_events(id) on delete cascade,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.automation_runs is
  'Trace of every rule evaluation (observability input for PHASE-15).';

create index if not exists automation_runs_event_idx
  on public.automation_runs (event_id);

alter table public.business_events enable row level security;
alter table public.automation_rules enable row level security;
alter table public.automation_runs enable row level security;

drop policy if exists "business_events: owner read" on public.business_events;
create policy "business_events: owner read" on public.business_events
  for select using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

drop policy if exists "automation_rules: owner read" on public.automation_rules;
create policy "automation_rules: owner read" on public.automation_rules
  for select using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

drop policy if exists "automation_runs: owner read" on public.automation_runs;
create policy "automation_runs: owner read" on public.automation_runs
  for select using (
    exists (
      select 1 from public.business_events e
      join public.shops s on s.id = e.shop_id
      where e.id = event_id and s.owner_id = auth.uid()
    )
  );

-- Domain emitter: observes order writes, never blocks them. The EXCEPTION guard
-- guarantees a journal failure degrades to a WARNING, not a failed checkout.
create or replace function public.emit_order_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.business_events (shop_id, type, payload)
    values (new.shop_id, 'ORDER_CREATED', jsonb_build_object(
      'order_id', new.id, 'order_number', new.order_number, 'total', new.total
    ));
    return new;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.business_events (shop_id, type, payload)
    values (new.shop_id, 'ORDER_' || upper(new.status), jsonb_build_object(
      'order_id', new.id, 'order_number', new.order_number, 'total', new.total,
      'from_status', old.status, 'to_status', new.status
    ));
    return new;
  end if;
  return coalesce(new, old);
exception
  when others then
    raise warning 'emit_order_events failed (non-blocking): %', sqlerrm;
    return coalesce(new, old);
end;
$$;

revoke all on function public.emit_order_events() from public, anon, authenticated;

drop trigger if exists orders_emit_events on public.orders;
create trigger orders_emit_events
  after insert or update of status on public.orders
  for each row execute function public.emit_order_events();
