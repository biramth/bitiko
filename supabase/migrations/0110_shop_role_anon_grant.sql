-- 0110_shop_role_anon_grant.sql — PHASE-16 Testing (grant drift fix).
--
-- The PHASE-16 RLS matrix caught a real dev/prod drift: on dev, anon CANNOT
-- execute shop_role() (0093's revoke stuck), so ANY anonymous SELECT on a table
-- with a team policy (products, categories, delivery_*, product_images…)
-- fails with `permission denied for function shop_role` — the public
-- storefront is broken for visitors. On prod the grant survived via schema
-- default privileges, which is why nobody noticed.
--
-- Why anon needs EXECUTE (not a leak): FOR ALL policies are evaluated for
-- every role, including anon storefront reads. shop_role() only ever returns
-- the CALLER's own role (null for anon — no auth.uid, no data), so executing
-- it reveals nothing. Same rationale as organization_role() (0099), granted
-- to anon + authenticated from day one.
--
-- Explicit per-role grants (no reliance on default privileges): converges dev
-- and prod to the same intended state; no-op where already granted.
-- Idempotent, re-runnable.

revoke all on function public.shop_role(uuid) from public;
grant execute on function public.shop_role(uuid) to anon, authenticated;
