-- 0102_cleanup_duplicate_type_index.sql — PHASE-05 follow-up.
--
-- Drops the rogue prototype index idx_shops_business_type_id on dev (leftover
-- from the same un-migrated prototype cleaned in 0098/0099/0100; 0101 created
-- the canonical shops_business_type_id_idx). Advisor flagged them as duplicates.
-- No-op on databases without the prototype (prod later) via IF EXISTS.
-- No data touched — indexes carry no rows.

drop index if exists public.idx_shops_business_type_id;
