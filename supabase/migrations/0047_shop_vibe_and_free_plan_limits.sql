-- Onboarding ambiance + free-plan limit bump.
--
-- 1) shops.vibe records the ambiance picked during onboarding ("Épuré",
--    "Cosy"…). It's metadata describing where the generated theme came from —
--    the actual colors/fonts/radii resolved by it live in theme_config (and
--    are fully editable afterwards), so no re-render on the storefront here.
--
-- 2) The free plan ("Découverte") is more generous: 8 → 15 active products
--    and 3 → 4 photos per product (the photo budget stays shared between
--    product gallery photos and variant photos). Numbers mirror
--    src/config/plans.ts's PLANS table; if they change, update both places.
--    Also fixes a copy-paste bug from migration 0046: the Essential plan key
--    was spelled 'essentiel', so Essential shops silently fell into the free
--    photo cap (3) instead of unlimited.

alter table public.shops
  add column vibe text;

comment on column public.shops.vibe is
  'Ambiance choisie à la création de la boutique (epure | cosy | colorful | premium).';

create or replace function public.plan_max_active_products(p_plan text)
returns integer
language sql
immutable
as $$
  select case p_plan
    when 'essential' then 50
    when 'pro' then null
    else 15 -- free
  end;
$$;

create or replace function public.plan_max_product_images(p_plan text)
returns integer
language sql
immutable
as $$
  select case p_plan
    when 'essential' then null
    when 'pro' then null
    else 4 -- free: 1 main photo + up to 3 more (gallery or variant) photos
  end;
$$;

-- Plan helpers stay locked down (same pass as 0028/0046): trigger helpers,
-- never meant to be called directly via /rest/v1/rpc.
alter function public.plan_max_active_products(text) set search_path = pg_catalog;
alter function public.plan_max_product_images(text) set search_path = pg_catalog;

revoke execute on function public.plan_max_active_products(text) from public, anon, authenticated;
revoke execute on function public.plan_max_product_images(text) from public, anon, authenticated;