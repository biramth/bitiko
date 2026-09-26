-- 0112_seed_new_business_types.sql — Seed 6 new business types for frontend alignment
-- Matches the landing page solutions + shopCategories
-- Run after 0111. (Le rôle des migrations contourne la RLS : plus de
-- désactivation/réactivation temporaire des policies, qui laissait les tables
-- sans RLS si l'exécution s'interrompait.)

-- 1. Insert new business types
INSERT INTO public.business_types (slug, name, description, icon, status, metadata) VALUES
  ('coiffure', 'Coiffure & beauté', 'Services, tarifs, prise de rendez-vous, équipe, galerie.', 'scissors', 'active', '{}'::jsonb),
  ('food_services', 'Food & services', 'Menu ou prestations, commande ou réservation, devis.', 'utensils-crossed', 'active', '{}'::jsonb),
  ('artisanat', 'Artisanat & créations', 'Chaque pièce est unique. Vitrine, photos HD, description, stock.', 'palette', 'active', '{}'::jsonb),
  ('restauration', 'Restauration & livraison', 'Plats, boissons, menus, packages. Commande, livraison, secteur.', 'chef-hat', 'active', '{}'::jsonb),
  ('deco', 'Décoration', 'Objets déco, mobilier, luminaires. Catalogue visuel, livraison.', 'home', 'active', '{}'::jsonb),
  ('librairie', 'Librairie & papeterie', 'Livres, carnets, fournitures. Catalogue, stock, livraison.', 'book-open', 'active', '{}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- 2. Map capabilities for each new type
-- Coiffure & beauté : services + produits + rendez-vous
INSERT INTO public.business_type_capabilities (business_type_id, capability_id)
SELECT b.id, c.id
FROM public.business_types b
JOIN public.capabilities c ON c.code IN (
  'HAS_SHOP','HAS_PRODUCTS','HAS_SERVICES','HAS_APPOINTMENTS','HAS_CALENDAR','HAS_RESERVATIONS',
  'HAS_ORDERS','HAS_CUSTOMERS','HAS_TEAM','HAS_ANALYTICS','HAS_REVIEWS','HAS_PROMOTIONS'
)
WHERE b.slug = 'coiffure'
ON CONFLICT DO NOTHING;

-- Food & services : produits + services + livraison + réservation
INSERT INTO public.business_type_capabilities (business_type_id, capability_id)
SELECT b.id, c.id
FROM public.business_types b
JOIN public.capabilities c ON c.code IN (
  'HAS_SHOP','HAS_PRODUCTS','HAS_SERVICES','HAS_DELIVERY','HAS_RESERVATIONS',
  'HAS_ORDERS','HAS_CUSTOMERS','HAS_TEAM','HAS_ANALYTICS','HAS_REVIEWS','HAS_PROMOTIONS',
  'HAS_PREPARATION_TIME'
)
WHERE b.slug = 'food_services'
ON CONFLICT DO NOTHING;

-- Artisanat & créations : produits + shop + livraison
INSERT INTO public.business_type_capabilities (business_type_id, capability_id)
SELECT b.id, c.id
FROM public.business_types b
JOIN public.capabilities c ON c.code IN (
  'HAS_SHOP','HAS_PRODUCTS','HAS_DELIVERY','HAS_ORDERS','HAS_CUSTOMERS',
  'HAS_ANALYTICS','HAS_REVIEWS','HAS_PROMOTIONS'
)
WHERE b.slug = 'artisanat'
ON CONFLICT DO NOTHING;

-- Restauration & livraison : produits + livraison + services + réservation
INSERT INTO public.business_type_capabilities (business_type_id, capability_id)
SELECT b.id, c.id
FROM public.business_types b
JOIN public.capabilities c ON c.code IN (
  'HAS_SHOP','HAS_PRODUCTS','HAS_DELIVERY','HAS_SERVICES','HAS_RESERVATIONS',
  'HAS_ORDERS','HAS_CUSTOMERS','HAS_TEAM','HAS_ANALYTICS','HAS_REVIEWS','HAS_PROMOTIONS',
  'HAS_PREPARATION_TIME'
)
WHERE b.slug = 'restauration'
ON CONFLICT DO NOTHING;

-- Décoration : produits + shop + livraison
INSERT INTO public.business_type_capabilities (business_type_id, capability_id)
SELECT b.id, c.id
FROM public.business_types b
JOIN public.capabilities c ON c.code IN (
  'HAS_SHOP','HAS_PRODUCTS','HAS_DELIVERY','HAS_ORDERS','HAS_CUSTOMERS',
  'HAS_ANALYTICS','HAS_REVIEWS','HAS_PROMOTIONS'
)
WHERE b.slug = 'deco'
ON CONFLICT DO NOTHING;

-- Librairie & papeterie : produits + shop + livraison
INSERT INTO public.business_type_capabilities (business_type_id, capability_id)
SELECT b.id, c.id
FROM public.business_types b
JOIN public.capabilities c ON c.code IN (
  'HAS_SHOP','HAS_PRODUCTS','HAS_DELIVERY','HAS_ORDERS','HAS_CUSTOMERS',
  'HAS_ANALYTICS','HAS_REVIEWS','HAS_PROMOTIONS'
)
WHERE b.slug = 'librairie'
ON CONFLICT DO NOTHING;

-- 3. Map new types to existing templates (reusing genre templates)
-- Coiffure -> beaute template (service-oriented showcase)
INSERT INTO public.template_business_types (template_id, business_type_id)
SELECT t.id, b.id
FROM public.templates t, public.business_types b
WHERE t.slug = 'beaute' AND b.slug = 'coiffure'
ON CONFLICT DO NOTHING;

-- Food services -> epicerie template (food-related)
INSERT INTO public.template_business_types (template_id, business_type_id)
SELECT t.id, b.id
FROM public.templates t, public.business_types b
WHERE t.slug = 'epicerie' AND b.slug = 'food_services'
ON CONFLICT DO NOTHING;

-- Artisanat -> mode template (visual product showcase)
INSERT INTO public.template_business_types (template_id, business_type_id)
SELECT t.id, b.id
FROM public.templates t, public.business_types b
WHERE t.slug = 'mode' AND b.slug = 'artisanat'
ON CONFLICT DO NOTHING;

-- Restauration -> epicerie template (food)
INSERT INTO public.template_business_types (template_id, business_type_id)
SELECT t.id, b.id
FROM public.templates t, public.business_types b
WHERE t.slug = 'epicerie' AND b.slug = 'restauration'
ON CONFLICT DO NOTHING;

-- Deco -> mode template (visual)
INSERT INTO public.template_business_types (template_id, business_type_id)
SELECT t.id, b.id
FROM public.templates t, public.business_types b
WHERE t.slug = 'mode' AND b.slug = 'deco'
ON CONFLICT DO NOTHING;

-- Librairie -> mode template (catalogue)
INSERT INTO public.template_business_types (template_id, business_type_id)
SELECT t.id, b.id
FROM public.templates t, public.business_types b
WHERE t.slug = 'mode' AND b.slug = 'librairie'
ON CONFLICT DO NOTHING;
