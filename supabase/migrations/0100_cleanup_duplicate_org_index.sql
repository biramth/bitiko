-- 0100_cleanup_duplicate_org_index.sql — PHASE-04 follow-up.
--
-- Drops the rogue prototype index shops_organization_idx on dev (leftover from
-- the same un-migrated prototype cleaned in 0098/0099; 0099 created the
-- canonical shops_organization_id_idx). Advisor flagged them as duplicates.
-- No-op on databases without the prototype (prod later) via IF EXISTS.
-- No data touched — indexes carry no rows.

drop index if exists public.shops_organization_idx;
