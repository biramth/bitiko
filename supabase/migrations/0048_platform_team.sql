-- ---------------------------------------------------------------------------
-- Platform team & roles.
--
-- Replaces the hardcoded email allowlist (PLATFORM_ADMIN_EMAILS in
-- api/_lib/supabaseAdmin.ts and the inline list inside is_platform_admin()
-- since 0033) with a real membership table so the SaaS team can have proper
-- accounts with distinct scopes:
--   owner     — full platform control, including managing who owns the platform
--   admin     — full platform control except owners themselves
--   dev       — same as admin minus team management (billing/build tooling)
--   marketing — analytics + shops + campaigns only, no payments, no team
--
-- Writes are deliberately service-role only (no RLS write policy), mirroring
-- shop_subscriptions / wave_payments: there is no Data-API path to edit a
-- member. Reads flow through get_platform_role() (self) and the role-gated
-- api/admin/platform endpoints (service role) — the browser never queries
-- this table directly.
-- ---------------------------------------------------------------------------

create table public.platform_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'dev', 'marketing')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.platform_members enable row level security;

-- Seed: the current single operator keeps full ownership.
insert into public.platform_members (user_id, role)
select id, 'owner'
from auth.users
where email = 'papebiramethiombanee@gmail.com'
  and not exists (select 1 from public.platform_members where role = 'owner');

-- ---------------------------------------------------------------------------
-- RPC guard. Every get_platform_* (0033, restated since) calls
-- is_platform_admin(); re-pointing it at platform_members upgrades them all
-- from "email in allowlist" to "is a platform member" with no body changes.
-- ---------------------------------------------------------------------------
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_members m
    where m.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- The calling member's own role (null when not a member) — lets the frontend
-- render the workspace tools the member actually has permission to use.
-- ---------------------------------------------------------------------------
create or replace function public.get_platform_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.platform_members m
  where m.user_id = (select auth.uid())
  limit 1;
$$;

revoke all on function public.get_platform_role() from public, anon;
grant execute on function public.get_platform_role() to authenticated;