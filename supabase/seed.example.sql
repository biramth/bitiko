-- Run this ONCE after creating your admin user in Supabase Auth
-- (Authentication > Users > Add user, or supabase.auth.signUp from the app).
--
-- Replace 'YOUR-AUTH-USER-UUID' with that user's id (copy it from the
-- Auth > Users table in the Supabase dashboard), then run this file in the
-- SQL editor. It creates the profile row and the shop row that everything
-- else (RLS policies, the storefront, the dashboard) is built around.

insert into public.profiles (id, role)
values ('YOUR-AUTH-USER-UUID', 'owner');

insert into public.shops (owner_id, name, description, whatsapp_number, currency)
values (
  'YOUR-AUTH-USER-UUID',
  'Ma Boutique',
  'Une description courte de la boutique.',
  '+221771234567',
  'XOF'
);
