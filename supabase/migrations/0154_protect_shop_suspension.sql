-- 0154_protect_shop_suspension.sql
--
-- La policy « shops: owner update » laisse le propriétaire (et un manager)
-- réécrire n'importe quelle colonne de sa boutique, y compris suspended_at :
-- une boutique suspendue par l'équipe Bitiko (0133) pouvait se rétablir
-- elle-même via le Data API. Seuls le service_role (auth.uid() nul, API
-- admin) et les chemins de confiance peuvent désormais la modifier ; toute
-- autre écriture conserve silencieusement l'ancienne valeur.
--
-- Idempotent, re-jouable.

create or replace function public.protect_shop_platform_columns()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null or current_setting('bitiko.trusted_shop_write', true) = '1' then
    return new;
  end if;
  new.suspended_at := old.suspended_at;
  return new;
end;
$$;

revoke all on function public.protect_shop_platform_columns() from public, anon, authenticated;

drop trigger if exists shops_protect_platform_columns on public.shops;
create trigger shops_protect_platform_columns
  before update on public.shops
  for each row execute function public.protect_shop_platform_columns();
