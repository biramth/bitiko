-- 0154_unverified_email_access.sql
--
-- Inscription sans mur de vérification : le commerçant accède au dashboard
-- dès son inscription, mais sa boutique reste hors ligne tant que son email
-- n'est pas confirmé (nécessite `mailer_allow_unverified_email_sign_ins` côté
-- Auth, confirmation d'email toujours active).
--
--  1. shops.owner_email_verified : reflet public de auth.users.email_confirmed_at
--     du propriétaire (la vitrine est anonyme, elle ne lit pas auth.users).
--     Calculé à l'insertion, resynchronisé quand l'email est confirmé.
--  2. Garde-colonnes : ni le propriétaire ni un manager ne peuvent réécrire
--     owner_email_verified ou suspended_at depuis le Data API (seuls le
--     service_role et les fonctions de confiance le peuvent).
--  3. Commandes / rendez-vous / réservations publics refusés tant que la
--     boutique n'est pas en ligne ; l'équipe de la boutique peut toujours en
--     saisir depuis le dashboard.
--  4. cleanup_unverified_users : un compte non vérifié peut désormais créer une
--     boutique — on ne supprime plus que les comptes sans boutique ni équipe,
--     après 7 jours.
--
-- Idempotent, re-jouable.

-- ---------------------------------------------------------------------------
-- 1. Statut public de vérification du propriétaire.
-- ---------------------------------------------------------------------------
alter table public.shops
  add column if not exists owner_email_verified boolean not null default true;

update public.shops s
set owner_email_verified = false
from auth.users u
where u.id = s.owner_id
  and u.email_confirmed_at is null
  and s.owner_email_verified;

create or replace function public.set_shop_owner_email_verified()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  new.owner_email_verified := exists (
    select 1 from auth.users u where u.id = new.owner_id and u.email_confirmed_at is not null
  );
  return new;
end;
$$;

revoke all on function public.set_shop_owner_email_verified() from public, anon, authenticated;

drop trigger if exists shops_set_owner_email_verified on public.shops;
create trigger shops_set_owner_email_verified
  before insert on public.shops
  for each row execute function public.set_shop_owner_email_verified();

create or replace function public.sync_shop_owner_email_verified()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform set_config('bitiko.trusted_shop_write', '1', true);
  update public.shops
  set owner_email_verified = (new.email_confirmed_at is not null)
  where owner_id = new.id
    and owner_email_verified is distinct from (new.email_confirmed_at is not null);
  perform set_config('bitiko.trusted_shop_write', '', true);
  return new;
end;
$$;

revoke all on function public.sync_shop_owner_email_verified() from public, anon, authenticated;

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is distinct from new.email_confirmed_at)
  execute function public.sync_shop_owner_email_verified();

-- ---------------------------------------------------------------------------
-- 2. Colonnes réservées à la plateforme.
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
  new.owner_email_verified := old.owner_email_verified;
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
-- 3. Pas de commande publique sur une boutique hors ligne.
-- ---------------------------------------------------------------------------
create or replace function public.block_suspended_shop_writes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_suspended boolean;
  v_verified boolean;
begin
  select s.suspended_at is not null, s.owner_email_verified
  into v_suspended, v_verified
  from public.shops s
  where s.id = new.shop_id;

  if v_suspended then
    raise exception 'shop_suspended' using errcode = 'P0001';
  end if;
  if v_verified is false and public.shop_role(new.shop_id) is null then
    raise exception 'shop_not_live' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function public.block_suspended_shop_writes() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Nettoyage des comptes non vérifiés : jamais un compte qui a une boutique.
-- ---------------------------------------------------------------------------
create or replace function public.cleanup_unverified_users(p_max_age interval default interval '7 days')
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
