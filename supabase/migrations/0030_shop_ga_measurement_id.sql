-- Lets a merchant plug in their own Google Analytics 4 property to track
-- their storefront's visitors. Gated to Essentiel+ (plans.ts `analytics`
-- field) at the UI layer, same pattern as the dashboard's analytics panels —
-- the column itself has no plan check so a downgraded shop keeps its saved
-- ID without losing it, it just stops being read/sent while on the free plan.

alter table public.shops add column ga_measurement_id text;

alter table public.shops add constraint shops_ga_measurement_id_format
  check (ga_measurement_id is null or ga_measurement_id ~ '^G-[A-Z0-9]+$');
