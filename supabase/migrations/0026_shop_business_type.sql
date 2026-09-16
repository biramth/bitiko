-- 0026_shop_business_type.sql
-- The merchant's business type (vertical) — independent of `template_id`.
-- A shop can switch between templates within its vertical without this
-- column changing; changing vertical is a separate, explicit choice in
-- Réglages, and it's what unlocks browsing templates outside the shop's
-- current one.
alter table public.shops
  add column business_type text;

comment on column public.shops.business_type is
  'Vertical (mode, epicerie, beaute, tech, ...) the merchant operates in. Chosen at onboarding, changeable later in Réglages. Independent of template_id.';

-- Every existing shop's vertical is exactly its onboarding template's key
-- today (each of the four genre templates maps 1:1 to a vertical), so the
-- backfill is a straight copy.
update public.shops
  set business_type = template_id
  where template_id is not null;
