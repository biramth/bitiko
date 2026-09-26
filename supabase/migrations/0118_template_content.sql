-- 0118 : les gabarits deviennent pilotés par données.
--   - `templates.content` (jsonb, null = gabarit code) : themeColor,
--     themeConfig, layout, variants, vertical — éditable sans déploiement
--     depuis l'admin plateforme (page Gabarits).
--   - 10 nouveaux gabarits catalogue (1 par groupe) + compatibilités.
-- Idempotent, re-exécutable.

alter table public.templates add column if not exists content jsonb;

comment on column public.templates.content is
  'Surcharge sans déploiement (admin plateforme) : { themeColor, themeConfig, layout, variants?, vertical? }. NULL = le gabarit code fait foi.';

insert into public.templates (slug, name, description) values
  ('bistrot', 'Bistrot', 'Ardoise et craie — bistrot de quartier, ambiance feutrée.'),
  ('minimal', 'Minimal', 'Noir et blanc, sans détour — la mode épurée.'),
  ('onglerie', 'Onglerie', 'Bar à ongles — coloré, joyeux, sans rendez-vous manqué.'),
  ('primeur', 'Primeur', 'Fruits et légumes — le marché en ligne.'),
  ('repair', 'Atelier Repair', 'Réparation et reconditionné — diagnostiqué, garanti.'),
  ('scandi', 'Scandinave', 'Blanc et bois clair — déco douce et lumineuse.'),
  ('apothicaire', 'Apothicaire', 'Remèdes et soins — herboristerie vintage.'),
  ('cave', 'Cave & Terroir', 'Bordeaux sombre — vins et produits du terroir.'),
  ('jardin', 'Jardin', 'Botanique — plantes, bouquets champêtres et abonnements.'),
  ('galerie', 'Galerie', 'Murs blancs — l’atelier exposé comme une galerie.')
on conflict (slug) do nothing;

-- Compatibilité groupe → gabarit (l'existant est conservé : choix élargi,
-- le gabarit exact reste proposé en premier côté front).
insert into public.template_business_types (template_id, business_type_id)
select t.id, b.id
from public.templates t
join public.business_types b on
  (b.slug = 'restauration' and t.slug = 'bistrot') or
  (b.slug = 'mode' and t.slug = 'minimal') or
  (b.slug = 'beaute' and t.slug = 'onglerie') or
  (b.slug = 'epicerie' and t.slug = 'primeur') or
  (b.slug = 'tech' and t.slug = 'repair') or
  (b.slug = 'deco' and t.slug = 'scandi') or
  (b.slug = 'cosmetiques' and t.slug = 'apothicaire') or
  (b.slug = 'epicerie_fine' and t.slug = 'cave') or
  (b.slug = 'fleurs_cadeaux' and t.slug = 'jardin') or
  (b.slug = 'artisanat' and t.slug = 'galerie')
on conflict do nothing;
