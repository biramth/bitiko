-- 0037: delivery must be 100% merchant-defined — no default zones anymore.
--
-- The onboarding flow used to seed one "Dakar" secteur + its 10 villes and the
-- 0009/0010 backfills applied that set to pre-existing shops. Merchants should
-- build their OWN secteurs and villes. This migration:
--   1. deletes those default-created rows (only the untouched defaults — any
--      secteur the merchant customized keeps its name/fee/villes),
--   2. drops the now-unused seed functions (including the long-dead flat-zones
--      seed, which references the `delivery_zones` table dropped in 0010).

-- 1) Remove default-seeded secteurs/villes ------------------------------------
do $$
declare
  default_villes text[] := array[
    'Dakar Plateau', 'Ouakam', 'Mermoz', 'Almadies', 'Sacré-Cœur', 'Grand Dakar',
    'HLM', 'Parcelles Assainies', 'Médina', 'Yoff'
  ];
  r record;
begin
  for r in
    select s.id
    from public.delivery_secteurs s
    where lower(s.name) = 'dakar'
      and coalesce(s.fee, 0) = 0
      -- every ville in the secteur is one of the defaults (a renamed or added
      -- one means the merchant took ownership of this secteur: keep it)
      and not exists (
        select 1 from public.delivery_villes v
        where v.secteur_id = s.id and v.name <> all (default_villes)
      )
      -- and it actually has villes (don't touch a custom empty "Dakar")
      and exists (
        select 1 from public.delivery_villes v where v.secteur_id = s.id
      )
  loop
    delete from public.delivery_villes where secteur_id = r.id;
    delete from public.delivery_secteurs where id = r.id;
  end loop;
end $$;

-- 2) Drop the seed functions (both revoke EXECUTE AUTOMATIQUEMENT) ------------
drop function if exists public.seed_default_delivery_secteurs(uuid);
drop function if exists public.seed_default_delivery_zones(uuid);