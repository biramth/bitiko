-- WhatsApp OTP verification during merchant onboarding. Codes are stored
-- hashed here (one active code per user) and issued/checked by
-- api/verify-whatsapp.ts. The delivery channel (mock / Twilio / Meta Cloud
-- API) is chosen server-side by the OTP_WHATSAPP_PROVIDER env var — this
-- table is the single audit trail no matter the channel.

create table public.whatsapp_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  phone text not null,
  code_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index whatsapp_verifications_user_created_idx
  on public.whatsapp_verifications (user_id, created_at desc);

alter table public.whatsapp_verifications enable row level security;

create policy "whatsapp_verifications: read own" on public.whatsapp_verifications
  for select using (auth.uid() = user_id);

create policy "whatsapp_verifications: insert own" on public.whatsapp_verifications
  for insert with check (auth.uid() = user_id);

create policy "whatsapp_verifications: update own" on public.whatsapp_verifications
  for update using (auth.uid() = user_id);