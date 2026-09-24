-- Per-shop cover banner shown at the top of the storefront home page.
-- Storage path "<shop_id>/banner.<ext>" in the existing shop-assets bucket,
-- already covered by that bucket's owner-scoped RLS policies (0004_storage.sql).
alter table public.shops add column banner_url text;
