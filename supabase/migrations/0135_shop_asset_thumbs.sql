-- Vignettes logo/bannière (optimisation images, lot 3) : le header, le footer
-- et l'admin affichent le logo en 32px, le hero sert la bannière en
-- responsive (srcset). Les boutiques existantes gardent *_thumb_url à NULL
-- et le front retombe sur l'URL pleine taille, sans backfill.
alter table public.shops
  add column if not exists logo_thumb_url text,
  add column if not exists banner_thumb_url text;
