-- Merchant-set highlight shown as a pastille on product cards ("Nouveau",
-- "Tendance", "-20%"...). Free text, short; empty = no pastille. No
-- backfill needed (null = absent, which is also the state of every existing
-- row). Table-level RLS policies already cover reads/writes, no change there.
alter table public.products
  add column if not exists badge text null
  check (char_length(badge) <= 24);
