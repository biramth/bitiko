-- Vignettes 400px générées à l'upload (optimisation images, lots 1+2) :
-- les cartes, grilles et vignettes admin servent thumb_url, les fiches
-- produit et la visionneuse gardent l'URL pleine taille. Les lignes
-- existantes gardent thumb_* à NULL et le front retombe sur l'URL pleine
-- taille, donc aucun backfill n'est nécessaire. RLS inchangée (niveau
-- ligne, les nouvelles colonnes suivent les policies existantes).

alter table public.product_images
  add column if not exists thumb_url text,
  add column if not exists thumb_path text;

alter table public.product_variants
  add column if not exists thumb_url text;

alter table public.categories
  add column if not exists thumb_url text;
