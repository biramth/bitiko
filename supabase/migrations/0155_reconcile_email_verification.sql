-- 0155_reconcile_email_verification.sql
--
-- La vérification d'email reste obligatoire (aucun accès au dashboard sans
-- email confirmé). Dev et prod ont reçu une première version de 0154
-- (« unverified_email_access ») avant son remplacement dans le dépôt par
-- « protect_shop_suspension ». Cette migration converge vers le même état
-- final quelle que soit la version appliquée :
--
--  1. Retrait de shops.owner_email_verified et de sa synchronisation depuis
--     auth.users (inutiles : un propriétaire de boutique est toujours vérifié).
--  2. block_suspended_shop_writes() revient au comportement de 0133.
--  3. Garde-colonnes conservé : suspended_at reste réservé à la plateforme.
--  4. cleanup_unverified_users : retour aux 24 h (politique de confidentialité),
--     en gardant la protection des comptes qui possèdent une boutique.
--
-- Idempotent, re-jouable.

-- ---------------------------------------------------------------------------
-- 1. Plus de statut « propriétaire vérifié » sur les boutiques.
-- ---------------------------------------------------------------------------
drop trigger if exists on_auth_user_email_confirmed on auth.users;
drop function if exists public.sync_shop_owner_email_verified();
drop trigger if exists shops_set_owner_email_verified on public.shops;
drop function if exists public.set_shop_owner_email_verified();

-- ---------------------------------------------------------------------------
-- 3. Garde-colonnes : suspended_at uniquement (avant le drop de la colonne,
--    la fonction ne doit plus la référencer).
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 2. Blocage des commandes : suspension seulement (comme 0133).
-- ---------------------------------------------------------------------------
create or replace function public.block_suspended_shop_writes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.shops s where s.id = new.shop_id and s.suspended_at is not null) then
    raise exception 'shop_suspended' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function public.block_suspended_shop_writes() from public, anon, authenticated;

alter table public.shops drop column if exists owner_email_verified;

-- ---------------------------------------------------------------------------
-- 4. Nettoyage des comptes non vérifiés : 24 h.
-- ---------------------------------------------------------------------------
create or replace function public.cleanup_unverified_users(p_max_age interval default interval '24 hours')
returns integer
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_deleted integer;
begin
  with doomed as (
    select u.id
    from auth.users u
    where u.email_confirmed_at is null
      and u.created_at < now() - p_max_age
      and not exists (select 1 from public.shops s where s.owner_id = u.id)
      and not exists (select 1 from public.shop_members sm where sm.user_id = u.id)
      and not exists (select 1 from public.platform_members pm where pm.user_id = u.id or pm.created_by = u.id)
      and not exists (select 1 from public.campaigns c where c.created_by = u.id)
  )
  delete from auth.users u
  using doomed d
  where u.id = d.id;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke execute on function public.cleanup_unverified_users(interval) from public, anon, authenticated;
