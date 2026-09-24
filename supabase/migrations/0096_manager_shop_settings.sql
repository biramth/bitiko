-- Team follow-up: managers run day-to-day settings (name, logo, theme,
-- delivery…) like the owner — billing, team management and shop deletion
-- stay owner-only. Without this, a manager sees the Paramètres pages but
-- every save is RLS-denied.
create policy "shops: manager update" on public.shops
  for update using (public.shop_role(id) = 'manager');
