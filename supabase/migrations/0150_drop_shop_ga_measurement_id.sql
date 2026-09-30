-- Retire la mesure Google Analytics 4 : le code n'envoie plus rien à Google
-- (voir la suppression de GoogleAnalytics.tsx) et aucun espace ne peut
-- activer de traceur tiers par boutique. Colonne jamais lue par le code
-- applicatif (aucune référence dans src/), suppression sans impact.
alter table public.shops drop constraint if exists shops_ga_measurement_id_format;
alter table public.shops drop column if exists ga_measurement_id;
