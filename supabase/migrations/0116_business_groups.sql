-- 0116 : organisation en 10 groupes d'activité (dashboard, frontstore et
-- outils suivent via les capabilities — aucun `if type ===` dans l'UI).
--   - Renomme les types existants vers les 10 groupes (slugs stables).
--   - Crée cosmetiques, epicerie_fine, fleurs_cadeaux (+ templates + mappings).
--   - Crée les templates DB manquants (restauration, artisanat, maison).
--   - Sort coiffure/librairie du picker (mappings supprimés, types + caps
--     conservés : les boutiques existantes continuent de fonctionner).
-- Idempotent, re-exécutable.

-- ── 1. Libellés des 10 groupes ────────────────────────────────────────────

update public.business_types set
  name = 'Restauration',
  description = 'Restaurant, traiteur, fast-food, snack, pâtisserie, boulangerie, café, salon de thé, food truck, livraison de repas.',
  icon = 'chef-hat'
where slug = 'restauration';

update public.business_types set
  name = 'Mode & Habillement',
  description = 'Vêtements, prêt-à-porter, friperie, chaussures, accessoires, sacs, bijoux, lingerie, couture, broderie.',
  icon = 'shirt'
where slug = 'mode';

update public.business_types set
  name = 'Beauté & Bien-être',
  description = 'Coiffure, barber, institut de beauté, maquillage, onglerie, parfumerie, soins corporels, spa, massage.',
  icon = 'scissors'
where slug = 'beaute';

update public.business_types set
  name = 'Commerce général',
  description = 'Épicerie, supérette, alimentation, boutique généraliste, grossiste, distributeur, bazar.',
  icon = 'shopping-cart'
where slug = 'epicerie';

update public.business_types set
  name = 'Électronique & Technologie',
  description = 'Téléphones, accessoires, informatique, électronique, réparation, consoles, gaming, objets connectés.',
  icon = 'smartphone'
where slug = 'tech';

update public.business_types set
  name = 'Maison & Décoration',
  description = 'Meubles, décoration, ameublement, literie, cuisine, luminaires, rideaux, tapis, électroménager.',
  icon = 'home'
where slug = 'deco';

update public.business_types set
  name = 'Artisanat & Création',
  description = 'Poterie, maroquinerie, sculpture, peinture, objets faits main, créations personnalisées.',
  icon = 'palette'
where slug = 'artisanat';

-- ── 2. Nouveaux groupes ───────────────────────────────────────────────────

insert into public.business_types (slug, name, description, icon, status, metadata) values
  ('cosmetiques', 'Cosmétiques & Soins', 'Cosmétiques, produits capillaires, skincare, huiles, savons, produits naturels, parfums.', 'sparkles', 'active', '{}'::jsonb),
  ('epicerie_fine', 'Alimentation & Épicerie fine', 'Produits locaux, chocolaterie, confiserie, épices, fruits et légumes, viande, poisson, produits artisanaux.', 'wheat', 'active', '{}'::jsonb),
  ('fleurs_cadeaux', 'Fleurs & Cadeaux', 'Fleuriste, bouquets, cadeaux, coffrets, personnalisation, articles événementiels.', 'flower', 'active', '{}'::jsonb)
on conflict (slug) do nothing;

-- ── 3. Capabilities ───────────────────────────────────────────────────────
-- Beauté : + calendrier + promos (même profil service que coiffure).
insert into public.business_type_capabilities (business_type_id, capability_id)
select b.id, c.id
from public.business_types b
join public.capabilities c on c.code in ('HAS_CALENDAR', 'HAS_PROMOTIONS')
where b.slug = 'beaute'
on conflict do nothing;

-- Commerce général : + promos + avis.
insert into public.business_type_capabilities (business_type_id, capability_id)
select b.id, c.id
from public.business_types b
join public.capabilities c on c.code in ('HAS_PROMOTIONS', 'HAS_REVIEWS')
where b.slug = 'epicerie'
on conflict do nothing;

-- Électronique : + promos.
insert into public.business_type_capabilities (business_type_id, capability_id)
select b.id, c.id
from public.business_types b
join public.capabilities c on c.code = 'HAS_PROMOTIONS'
where b.slug = 'tech'
on conflict do nothing;

-- Nouveaux groupes : profil commerce (vitrine, livraison, commandes, clients,
-- pilotage, avis, promos) — sans briques service.
insert into public.business_type_capabilities (business_type_id, capability_id)
select b.id, c.id
from public.business_types b
join public.capabilities c on c.code in (
  'HAS_SHOP', 'HAS_PRODUCTS', 'HAS_DELIVERY', 'HAS_ORDERS',
  'HAS_CUSTOMERS', 'HAS_ANALYTICS', 'HAS_REVIEWS', 'HAS_PROMOTIONS'
)
where b.slug in ('cosmetiques', 'epicerie_fine', 'fleurs_cadeaux')
on conflict do nothing;

-- ── 4. Templates DB + compatibilité ───────────────────────────────────────

insert into public.templates (slug, name, description) values
  ('restauration', 'Restaurant', 'Carte, réservation de tables et commande pour restaurants.'),
  ('artisanat', 'Artisanat', 'Vitrine visuelle pour créations artisanales.'),
  ('maison', 'Maison', 'Catalogue visuel pour décoration et ameublement.'),
  ('cosmetiques', 'Cosmétiques', 'Vitrine pour cosmétiques et soins.'),
  ('epicerie_fine', 'Épicerie fine', 'Vitrine gourmande pour produits locaux et artisanaux.'),
  ('fleurs_cadeaux', 'Fleurs & Cadeaux', 'Vitrine pour fleuristes et cadeaux.')
on conflict (slug) do nothing;

-- Sortie du picker : coiffure (doublon de Beauté & Bien-être) et librairie
-- (hors des 10 groupes). Types + capabilities conservés pour l'existant.
delete from public.template_business_types
where business_type_id in (select id from public.business_types where slug in ('coiffure', 'librairie'));

-- Compatibilité groupe → template (le front choisit le gabarit exact en premier).
insert into public.template_business_types (template_id, business_type_id)
select t.id, b.id
from public.templates t
join public.business_types b on
  (b.slug = 'restauration' and t.slug = 'restauration') or
  (b.slug = 'artisanat' and t.slug = 'artisanat') or
  (b.slug = 'deco' and t.slug = 'maison') or
  (b.slug = 'cosmetiques' and t.slug = 'cosmetiques') or
  (b.slug = 'epicerie_fine' and t.slug = 'epicerie_fine') or
  (b.slug = 'fleurs_cadeaux' and t.slug = 'fleurs_cadeaux')
on conflict do nothing;
