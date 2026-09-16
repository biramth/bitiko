-- 0023_shop_template_id.sql
-- Persist the commerce genre template chosen when a shop is created.
alter table public.shops
  add column template_id text;

comment on column public.shops.template_id is
  'Key of the StoredTemplate applied when the shop was created (mode, epicerie, beaute, tech).';