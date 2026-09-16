-- Security hardening pass (Supabase security advisor + manual review).
--
-- 1) Every function in `public` was created without an explicit
--    `revoke execute from public`, so Postgres's default applies: EXECUTE is
--    granted to PUBLIC (which anon/authenticated inherit) regardless of any
--    later `grant ... to authenticated`. Several SECURITY DEFINER functions
--    that were only ever meant to run as triggers, or to be called by an
--    authenticated shop owner, were therefore reachable by anyone —
--    including completely unauthenticated requests — via
--    /rest/v1/rpc/<function_name>.
--
-- 2) seed_default_delivery_secteurs()/seed_default_delivery_zones() are
--    SECURITY DEFINER and take an arbitrary p_shop_id with no ownership
--    check at all. Combined with (1), any anonymous caller could seed
--    another merchant's brand-new shop with default delivery zones before
--    the owner does (the idempotent "only if empty" guard caps the damage
--    to that, but it's still writing to a shop that isn't theirs). Adds an
--    explicit owner check, same pattern as every other owner-scoped RPC.

alter function public.set_updated_at() set search_path = pg_catalog;

-- plan_max_active_products()/plan_max_custom_pages() take a plain text key
-- and return a literal from a case statement — no table access — but the
-- advisor still flags them for the same mutable-search_path reason.
alter function public.plan_max_active_products(text) set search_path = pg_catalog;
alter function public.plan_max_custom_pages(text) set search_path = pg_catalog;

-- Trigger-only functions: never meant to be called directly via RPC. Firing
-- as a trigger doesn't require the invoking role to hold EXECUTE.
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.enforce_product_limit() from public, anon, authenticated;
revoke execute on function public.enforce_page_limit() from public, anon, authenticated;

-- Internal helpers used only inside the triggers above — not meant to be
-- called directly either.
revoke execute on function public.effective_plan_key(uuid) from public, anon, authenticated;
revoke execute on function public.plan_max_active_products(text) from public, anon, authenticated;
revoke execute on function public.plan_max_custom_pages(text) from public, anon, authenticated;

-- Event-trigger function: fires automatically on DDL, never via RPC.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- Owner-only RPCs: authenticated shop owners, never anon.
revoke execute on function public.set_order_status(uuid, text) from public, anon;
grant execute on function public.set_order_status(uuid, text) to authenticated;

revoke execute on function public.set_order_delivery_fee(uuid, numeric) from public, anon;
grant execute on function public.set_order_delivery_fee(uuid, numeric) to authenticated;

-- seed_default_delivery_*: add the ownership check every other owner-scoped
-- function already has, then restrict to authenticated (still callable with
-- someone else's shop_id, but now rejected instead of silently seeding it).
create or replace function public.seed_default_delivery_secteurs(p_shop_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secteur_id uuid;
  v_ville text;
begin
  if not exists (select 1 from public.shops where id = p_shop_id and owner_id = auth.uid()) then
    raise exception 'not authorized';
  end if;

  if exists (select 1 from public.delivery_secteurs where shop_id = p_shop_id) then
    return;
  end if;

  insert into public.delivery_secteurs (shop_id, name, fee)
  values (p_shop_id, 'Dakar', 0)
  returning id into v_secteur_id;

  foreach v_ville in array array[
    'Dakar Plateau', 'Ouakam', 'Mermoz', 'Almadies', 'Sacré-Cœur', 'Grand Dakar',
    'HLM', 'Parcelles Assainies', 'Médina', 'Yoff'
  ]
  loop
    insert into public.delivery_villes (shop_id, secteur_id, name, is_active)
    values (p_shop_id, v_secteur_id, v_ville, true);
  end loop;
end;
$$;

revoke execute on function public.seed_default_delivery_secteurs(uuid) from public, anon;
grant execute on function public.seed_default_delivery_secteurs(uuid) to authenticated;

-- seed_default_delivery_zones() targets `delivery_zones`, a table dropped by
-- 0010_delivery_secteurs_and_villes.sql (superseded by delivery_secteurs +
-- delivery_villes). It's dead code — unused anywhere in src/ — and would
-- error out if ever called since its target table no longer exists. Drop it
-- rather than hardening a function that can't run.
drop function if exists public.seed_default_delivery_zones(uuid);

-- create_order: intentionally left as-is (anon + authenticated) — guest
-- checkout with no account is a deliberate product decision, and the
-- function already validates everything server-side (stock, price, active
-- status) rather than trusting its inputs.
