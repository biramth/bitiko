-- 0138_template_ownership.sql
--
-- Dichotomie activité/gabarit (suite) : un gabarit peut être partagé entre plusieurs
-- activités (`template_business_types`, inchangé), mais chaque activité doit avoir au
-- moins un gabarit qui lui appartient en propre.
--
-- 1. `templates.owner_business_type_id` : à quelle activité ce gabarit appartient
--    à l'origine. Nullable — un gabarit purement partagé peut rester sans propriétaire ;
--    l'outil admin (Plateforme → Gabarits) signale alors les activités actives qui n'en
--    possèdent aucun, sans rien bloquer.
--
-- 2. Backfill sans ambiguïté : les 9 gabarits dont le slug est identique à celui de
--    l'activité qu'ils servaient à l'origine (mode, épicerie, beauté, tech,
--    cosmétiques, épicerie fine, fleurs & cadeaux, artisanat, restauration).
--    `deco` reste volontairement sans propriétaire (3 gabarits compatibles — maison,
--    mode, scandi — aucun ne porte son nom) : à l'équipe de trancher via l'outil admin.
--
-- 3. Coiffure & Librairie : à la réorganisation en 10 groupes (0116), les deux ont
--    perdu toute compatibilité de gabarit et ont disparu du picker d'onboarding
--    (aucune boutique n'utilise l'un ou l'autre aujourd'hui — vérifié en prod).
--      - Coiffure double « Beauté & Bien-être » (dont la description couvre déjà
--        coiffure/barber) : passe en status='deprecated', reste en base pour toute
--        donnée historique qui la référencerait.
--      - Librairie est une activité à part entière (aucun des 10 groupes ne la
--        couvre) : redevient un groupe pickable, avec son propre gabarit dédié
--        (contenu dans src/config/storeTemplates.ts, vertical 'librairie').
--        Ses capacités (0112 : HAS_SHOP/HAS_PRODUCTS/HAS_ORDERS/HAS_DELIVERY…)
--        n'ont pas bougé et restent adaptées.
--
-- Idempotent, re-jouable.

alter table public.templates
  add column if not exists owner_business_type_id uuid references public.business_types(id);

create index if not exists templates_owner_business_type_idx
  on public.templates (owner_business_type_id);

-- 2. Backfill des paires sans ambiguïté (slug de gabarit = slug d'activité).
update public.templates t
set owner_business_type_id = b.id
from public.business_types b
where b.slug = t.slug
  and t.slug in ('mode', 'epicerie', 'beaute', 'tech', 'cosmetiques', 'epicerie_fine', 'fleurs_cadeaux', 'artisanat', 'restauration')
  and t.owner_business_type_id is null;

-- 3a. Coiffure : doublon de Beauté & Bien-être, dépréciée (0 boutique concernée).
update public.business_types
set status = 'deprecated'
where slug = 'coiffure' and status <> 'deprecated';

-- 3b. Librairie : activité à part entière, redevient pickable avec son propre gabarit.
insert into public.templates (slug, name, description) values
  ('librairie', 'Librairie', 'Vitrine chaleureuse pour librairie, papeterie ou point presse.')
on conflict (slug) do nothing;

update public.templates t
set owner_business_type_id = b.id
from public.business_types b
where t.slug = 'librairie' and b.slug = 'librairie' and t.owner_business_type_id is null;

insert into public.template_business_types (template_id, business_type_id)
select t.id, b.id
from public.templates t, public.business_types b
where t.slug = 'librairie' and b.slug = 'librairie'
on conflict do nothing;
