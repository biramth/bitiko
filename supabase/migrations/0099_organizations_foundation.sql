-- 0099_organizations_foundation.sql — PHASE-04 Auth + Organizations + Memberships.
--
-- Introduces USER → ORGANIZATION → MEMBERSHIP WITHOUT touching anything existing:
--   organizations          — the activity (coiffeur, spa, boutique…), may own 0..N shops
--   organization_members   — user↔organization link + role (owner/admin/manager/staff)
--   permissions            — granular permission catalog (enforced from PHASE-06)
--   role_permissions       — role→permission mapping (owner/admin seeded; rest in PHASE-06)
--   shops.organization_id  — nullable bridge to the new model (backfilled 1:1)
--
-- Cohabitation (see docs/refonte/PHASE-04-DESIGN.md): shops.owner_id, shop_members,
-- every existing policy and function stay exactly as they are. New RLS is additive only.
-- Custom roles deferred (TEXT check, dedicated table later if needed — PHASE-06/P14).
-- No frontend change, no onboarding change, no billing change.
--
-- Idempotent: IF NOT EXISTS + named constraints + ON CONFLICT DO NOTHING +
-- backfill guarded (organization_id IS NULL, marker in metadata), re-runnable.
-- Rollback (dev only): drop new tables/column (no dependents yet outside backfill).

-- 0. APPROVED cleanup (decideur, 2026-09-25) : rogue prototype leftovers with NO
--    migration file — 2 triggers on shops (shops_create_organization BEFORE INSERT,
--    shops_delete_organization) + 4 functions (create_reservation,
--    create_shop_organization, delete_shop_organization, get_plans). The triggers
--    fired prototype code on every shop write (now broken since 0098 dropped their
--    tables). None of this is referenced by any app code.
--    If any is ever needed, recreate it properly (dedicated migration + minimal
--    grants) — see docs/refonte/PHASE-04-DESIGN.md. No overloads exist, so the
--    arg-less DROP FUNCTION form is unambiguous.
drop trigger if exists shops_create_organization on public.shops;
drop trigger if exists shops_delete_organization on public.shops;
drop function if exists public.create_reservation;
drop function if exists public.create_shop_organization;
drop function if exists public.delete_shop_organization;
drop function if exists public.get_plans;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Future display/URL use; no business constraint today.
  slug text unique check (slug is null or slug ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'),
  status text not null default 'active' check (status in ('active', 'suspended', 'draft')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.organizations is
  'The activity/business a user manages (salon, restaurant, boutique…). Owns team, subscription and 0..N shops (the commerce morceaux).';

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  -- Email invite parity with shop_members: row may exist before claim.
  email text,
  role text not null default 'staff' check (role in ('owner', 'admin', 'manager', 'staff')),
  invited_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  check (user_id is not null or email is not null),
  unique (organization_id, user_id),
  unique (organization_id, email)
);

comment on table public.organization_members is
  'Membership user↔organization + role. Coexists with shop_members (kept as-is); unified invite flow in PHASE-06.';

create index if not exists organization_members_user_idx
  on public.organization_members (user_id);
create index if not exists organization_members_org_idx
  on public.organization_members (organization_id);

-- Granular permission catalog. Enforcement arrives with workspace modules
-- (PHASE-06); the catalog exists now so later phases reference codes, never
-- hardcoded strings.
create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_.]+$'),
  label text not null,
  category text not null,
  description text,
  created_at timestamptz not null default now()
);

comment on table public.permissions is
  'Granular permission catalog (products.read, billing.manage…). Frontend never enforces alone — server-side checks from PHASE-06.';

create table if not exists public.role_permissions (
  role text not null check (role in ('owner', 'admin', 'manager', 'staff')),
  permission_code text not null references public.permissions(code) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role, permission_code)
);

comment on table public.role_permissions is
  'Role→permission mapping. owner/admin fully seeded; manager/staff mapped in PHASE-06 alongside modules.';

-- Bridge to the new model. RESTRICT: no accidental deletion of establishments;
-- no organization-deletion flow exists in this phase.
alter table public.shops
  add column if not exists organization_id uuid references public.organizations(id);

comment on column public.shops.organization_id is
  'Owning activity (PHASE-04+). Nullable during cohabitation; shops.owner_id and shop_members stay authoritative until PHASE-06.';

create index if not exists shops_organization_id_idx
  on public.shops (organization_id);

-- Role of the caller on an organization (null = outsider). SECURITY DEFINER so
-- member-read policies share it without recursive RLS lookups (same pattern as
-- shop_role()). Granted to anon AND authenticated ON PURPOSE: RLS policies call
-- it for every role (including anon storefront-adjacent reads), and it only ever
-- returns the caller's own role (null for anon) — verified load-bearing, do not revoke.
create or replace function public.organization_role(p_organization_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.organization_members m
  where m.organization_id = p_organization_id and m.user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.organization_role(uuid) from public;
grant execute on function public.organization_role(uuid) to anon, authenticated;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;

-- Member read (additive; nothing existing touched). Deliberately NO write
-- policy: creation/invitation flows arrive via RPC/service-role in PHASE-06.
drop policy if exists "organizations: member read" on public.organizations;
create policy "organizations: member read" on public.organizations
  for select using (public.organization_role(id) is not null);

drop policy if exists "organization_members: member read" on public.organization_members;
create policy "organization_members: member read" on public.organization_members
  for select using (public.organization_role(organization_id) is not null);

-- Referentials: public read, platform-only writes (pattern éprouvé).
drop policy if exists "permissions: public read" on public.permissions;
create policy "permissions: public read" on public.permissions
  for select using (true);

drop policy if exists "role_permissions: public read" on public.role_permissions;
create policy "role_permissions: public read" on public.role_permissions
  for select using (true);

-- Seed: permission catalog (enforcement in PHASE-06).
insert into public.permissions (code, label, category) values
  ('products.read', 'Voir les produits', 'catalogue'),
  ('products.create', 'Créer des produits', 'catalogue'),
  ('products.update', 'Modifier les produits', 'catalogue'),
  ('products.delete', 'Supprimer des produits', 'catalogue'),
  ('orders.read', 'Voir les commandes', 'ventes'),
  ('orders.update', 'Avancer les commandes', 'ventes'),
  ('orders.cancel', 'Annuler les commandes', 'ventes'),
  ('customers.read', 'Voir les clients', 'clients'),
  ('customers.update', 'Modifier les clients', 'clients'),
  ('analytics.read', 'Voir les statistiques', 'pilotage'),
  ('settings.manage', 'Gérer les paramètres', 'activité'),
  ('billing.manage', 'Gérer la facturation', 'activité'),
  ('team.manage', 'Gérer l''équipe', 'équipe'),
  ('storefront.manage', 'Gérer la vitrine', 'vitrine')
on conflict (code) do nothing;

-- Seed: owner/admin hold every permission; manager/staff mapped in PHASE-06.
insert into public.role_permissions (role, permission_code)
select r.role, p.code
from (values ('owner'), ('admin')) as r(role)
cross join public.permissions p
on conflict do nothing;

-- Backfill (idempotent, additive): 1 organization per shop owner + claimed
-- members mirrored (manager→manager, vendeur→staff). Pending email invites are
-- left to the existing shop flow (unified in PHASE-06). No-op on empty databases.
do $$
declare
  r record;
  v_org_id uuid;
  v_name text;
begin
  for r in
    select distinct owner_id from public.shops where organization_id is null
  loop
    select id into v_org_id
    from public.organizations
    where metadata->>'backfilled_from_owner' = r.owner_id::text
    limit 1;

    if v_org_id is null then
      select s.name into v_name
      from public.shops s
      where s.owner_id = r.owner_id
      order by s.created_at
      limit 1;

      insert into public.organizations (name, metadata)
      values (
        coalesce(v_name, 'Mon activité'),
        jsonb_build_object('backfilled_from_owner', r.owner_id::text)
      )
      returning id into v_org_id;

      insert into public.organization_members (organization_id, user_id, role, accepted_at)
      values (v_org_id, r.owner_id, 'owner', now())
      on conflict do nothing;
    end if;

    update public.shops
    set organization_id = v_org_id
    where owner_id = r.owner_id and organization_id is null;

    insert into public.organization_members (organization_id, user_id, email, role, invited_by, accepted_at)
    select
      v_org_id,
      m.user_id,
      m.email,
      case m.role when 'manager' then 'manager' else 'staff' end,
      m.invited_by,
      m.accepted_at
    from public.shop_members m
    join public.shops s on s.id = m.shop_id
    where s.organization_id = v_org_id and m.user_id is not null
    on conflict do nothing;
  end loop;
end $$;
