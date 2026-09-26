-- 0120 : annule 0119 — un salon vend bel et bien des produits en ligne.
-- Restaure HAS_PRODUCTS / HAS_ORDERS / HAS_CUSTOMERS sur beaute + coiffure.
-- La lisibilité du mélange commerce + service relève de l'UI (titres de
-- sections, ordre des groupes), pas du modèle. Idempotent.

insert into public.business_type_capabilities (business_type_id, capability_id)
select b.id, c.id
from public.business_types b
join public.capabilities c on c.code in ('HAS_PRODUCTS', 'HAS_ORDERS', 'HAS_CUSTOMERS')
where b.slug in ('beaute', 'coiffure')
on conflict do nothing;
