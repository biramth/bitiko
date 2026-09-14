-- Merchants normally get here through the app's own signup + onboarding
-- flow (/inscription then /admin/onboarding), which creates the profile and
-- shop rows for you. This file is only useful to manually seed a shop from
-- the SQL editor — e.g. to test the storefront before wiring up signup, or
-- to create a shop for a user added directly in Authentication > Users.
--
-- Replace 'YOUR-AUTH-USER-UUID' with that user's id (Auth > Users in the
-- Supabase dashboard) and 'ma-boutique' with the subdomain slug you want
-- (letters/digits/hyphens, must be unique — this is what makes the shop
-- reachable at ma-boutique.<VITE_ROOT_DOMAIN>).

insert into public.profiles (id, role)
values ('YOUR-AUTH-USER-UUID', 'owner');

insert into public.shops (owner_id, name, slug, description, whatsapp_number, currency)
values (
  'YOUR-AUTH-USER-UUID',
  'Ma Boutique',
  'ma-boutique',
  'Une description courte de la boutique.',
  '+221771234567',
  'XOF'
);
