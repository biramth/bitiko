-- Team access per shop (Pro feature — see Plan.teamAccess): the owner invites
-- collaborators by email with a role; the invitee claims it on their next
-- login via claim_shop_invites() (email match, no backoffice involved).
-- Roles: manager ≈ owner except shop settings/billing/team (owner-only);
-- vendeur = read everything + advance order statuses.
create table public.shop_members (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  -- Invited email; user_id stays null until the invitee claims the invite.
  email text not null,
  user_id uuid null references auth.users(id) on delete cascade,
  role text not null default 'vendeur' check (role in ('manager', 'vendeur')),
  invited_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz null,
  unique (shop_id, email)
);

create index shop_members_user_idx on public.shop_members (user_id);
create index shop_members_shop_idx on public.shop_members (shop_id);

alter table public.shop_members enable row level security;

-- Owner manages their shops' rows; a member reads the rows of shops they
-- belong to (so the team UI can show who's in).
create policy "shop_members: owner manage" on public.shop_members
  for all using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

create policy "shop_members: member read" on public.shop_members
  for select using (user_id = auth.uid());

-- Claim: the signed-in user takes ownership of invites sent to their email.
-- Narrow by construction: only null user_id rows matching their own email.
create policy "shop_members: claim own invite" on public.shop_members
  for update using (
    user_id is null and email = (auth.jwt() ->> 'email')
  ) with check (
    user_id = auth.uid() and email = (auth.jwt() ->> 'email')
  );

-- Role of the caller on a shop (null = outsider). SECURITY DEFINER so every
-- policy below can share it without recursive RLS lookups.
create or replace function public.shop_role(p_shop_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (select 1 from public.shops s where s.id = p_shop_id and s.owner_id = auth.uid()) then 'owner'
    else (select m.role from public.shop_members m where m.shop_id = p_shop_id and m.user_id = auth.uid() limit 1)
  end;
$$;

revoke all on function public.shop_role(uuid) from public, anon;

-- Claim RPC called once per login from the admin app (idempotent).
create or replace function public.claim_shop_invites()
returns setof uuid
language sql
security definer
set search_path = public
as $$
  update public.shop_members
  set user_id = auth.uid(), accepted_at = coalesce(accepted_at, now())
  where user_id is null and email = (auth.jwt() ->> 'email')
  returning shop_id;
$$;

revoke all on function public.claim_shop_invites() from public, anon;
grant execute on function public.claim_shop_invites() to authenticated;
