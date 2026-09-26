-- 0113_remove_duplicate_food_services.sql — food_services est fusionné dans restauration.
--
-- La FK shops.business_type_id est RESTRICT (un type ne se supprime pas tant
-- qu'une boutique le référence) : on re-pointe d'abord les boutiques vers
-- `restauration` (colonne FK + colonne texte legacy), sinon la suppression
-- échoue ou, pire, laisse des boutiques avec un type introuvable (workspace
-- sans aucun module). Idempotent, re-exécutable.

DO $$
DECLARE
  food_id uuid;
  resto_id uuid;
BEGIN
  SELECT id INTO food_id FROM public.business_types WHERE slug = 'food_services';
  SELECT id INTO resto_id FROM public.business_types WHERE slug = 'restauration';

  IF food_id IS NULL THEN
    RETURN;
  END IF;
  IF resto_id IS NULL THEN
    RAISE EXCEPTION 'restauration business type missing: cannot merge food_services';
  END IF;

  -- 1. Boutiques : FK + texte legacy vers restauration.
  UPDATE public.shops SET business_type_id = resto_id WHERE business_type_id = food_id;
  UPDATE public.shops SET business_type = 'restauration' WHERE business_type = 'food_services';

  -- 2. Mappings gabarits et capabilities de food_services.
  DELETE FROM public.template_business_types WHERE business_type_id = food_id;
  DELETE FROM public.business_type_capabilities WHERE business_type_id = food_id;

  -- 3. Le type lui-même.
  DELETE FROM public.business_types WHERE id = food_id;
END $$;
