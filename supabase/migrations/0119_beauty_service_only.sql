-- 0119 : Beauté & Bien-être (+ doublon legacy coiffure) = 100 % service.
-- Retire HAS_PRODUCTS / HAS_ORDERS / HAS_CUSTOMERS : un salon ne fait pas de
-- commerce en ligne (ni catalogue, ni commandes, ni CRM commandes). Les
-- données existantes ne sont pas touchées (les capabilities ne pilotent que
-- l'UI) ; RLS inchangé. Idempotent.

delete from public.business_type_capabilities
where business_type_id in (select id from public.business_types where slug in ('beaute', 'coiffure'))
  and capability_id in (select id from public.capabilities where code in ('HAS_PRODUCTS', 'HAS_ORDERS', 'HAS_CUSTOMERS'));
