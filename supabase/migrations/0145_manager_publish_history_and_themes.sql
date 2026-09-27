-- Un manager (shop_members.role = 'manager') a accès à tout le store builder
-- (« Personnaliser » n'est pas dans permissions.ts DENIED['manager']), mais
-- deux tables du builder n'ont jamais reçu la policy manager ajoutée par
-- 0093/0094 pour le reste : shop_publish_history (historique/undo/restauration
-- 1-clic) et shop_saved_themes (palettes sauvegardées). Résultat : un manager
-- ouvre Personnaliser normalement, mais y voit un historique et des palettes
-- toujours vides — RLS filtre silencieusement, sans erreur visible.
-- Idempotent, re-exécutable.

drop policy if exists "Manager reads publish history" on public.shop_publish_history;
create policy "Manager reads publish history"
  on public.shop_publish_history for select
  using (public.shop_role(shop_id) = 'manager');

drop policy if exists "Manager inserts publish history" on public.shop_publish_history;
create policy "Manager inserts publish history"
  on public.shop_publish_history for insert
  with check (public.shop_role(shop_id) = 'manager');

drop policy if exists "Manager manages saved themes" on public.shop_saved_themes;
create policy "Manager manages saved themes"
  on public.shop_saved_themes for all
  using (public.shop_role(shop_id) = 'manager')
  with check (public.shop_role(shop_id) = 'manager');
