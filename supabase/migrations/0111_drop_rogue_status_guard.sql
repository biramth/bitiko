-- 0111_drop_rogue_status_guard.sql — PHASE-16 Testing (drift removal).
--
-- The PHASE-16 RLS matrix caught another un-migrated prototype leftover on dev:
-- trigger orders_guard_status + guard_order_status(), forcing every order-status
-- change through a GUC flag that NOTHING sets — not even set_order_status()
-- itself. Result: order advancement is entirely broken on dev (legit RPC path
-- included). Same approved class as the 0098/0099/0104/0105 cleanups: no
-- migration file, no code references it, actively harmful. Dropped; no-op
-- elsewhere via IF EXISTS. Status scoping stays covered by
-- enforce_order_update_scope() (0109), which permits the legitimate paths.

drop trigger if exists orders_guard_status on public.orders;
drop function if exists public.guard_order_status();
