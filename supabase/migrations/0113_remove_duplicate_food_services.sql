-- 0113_remove_duplicate_food_services.sql — Remove duplicate food_services (merged into restauration)

-- First, get the IDs
DO $$
DECLARE
  food_id uuid;
  resto_id uuid;
BEGIN
  SELECT id INTO food_id FROM public.business_types WHERE slug = 'food_services';
  SELECT id INTO resto_id FROM public.business_types WHERE slug = 'restauration';
  
  -- 1. Delete template mappings for food_services (avoids duplicate when re-pointing to resto)
  DELETE FROM public.template_business_types WHERE business_type_id = food_id;
  
  -- 2. Delete capabilities
  DELETE FROM public.business_type_capabilities WHERE business_type_id = food_id;
  
  -- 3. Delete the type
  DELETE FROM public.business_types WHERE id = food_id;
END $$;

-- Verify
SELECT slug FROM public.business_types ORDER BY slug;