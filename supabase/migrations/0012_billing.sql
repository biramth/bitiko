-- Subscription billing (Wave Business checkout). Both tables are readable
-- only by the owning shop's owner and, crucially, carry NO insert/update
-- policy for anon/authenticated at all: writes happen exclusively through
-- server-side code (Vercel functions) using the Supabase service_role key,
-- which bypasses RLS. This is deliberate — unlike a plan column added
-- directly to `shops` (where the existing "owner update" policy would let a
-- browser client set its own plan for free), a merchant has no way to grant
-- themselves a paid plan by calling the Supabase client directly.

create table public.shop_subscriptions (
  shop_id uuid primary key references public.shops(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  status text not null default 'active' check (status in ('active', 'past_due')),
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create trigger shop_subscriptions_set_updated_at
  before update on public.shop_subscriptions
  for each row execute function public.set_updated_at();

alter table public.shop_subscriptions enable row level security;

create policy "shop_subscriptions: owner read" on public.shop_subscriptions
  for select using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

create table public.wave_payments (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  plan text not null check (plan in ('pro')),
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'XOF',
  client_reference text not null unique,
  wave_checkout_id text unique,
  wave_transaction_id text,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index wave_payments_shop_idx on public.wave_payments (shop_id, created_at desc);

alter table public.wave_payments enable row level security;

create policy "wave_payments: owner read" on public.wave_payments
  for select using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );
