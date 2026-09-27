-- 0136_phone_triggers_security_definer.sql
--
-- Correctif de 0128 : les fonctions de trigger qui normalisent les téléphones
-- s'exécutaient avec les droits de l'appelant (SECURITY INVOKER) alors que
-- `normalize_phone` n'est exécutable ni par `anon` ni par `authenticated`.
-- Résultat : toute écriture directe d'un utilisateur sur shops.whatsapp_number,
-- shops.country_code, profiles.phone ou orders.customer_phone échouait avec
-- « permission denied for function normalize_phone » (création de boutique à
-- l'onboarding notamment).
--
-- Les trois fonctions passent en SECURITY DEFINER avec un search_path figé
-- (pg_catalog, toutes les références sont qualifiées) ; leur exécution directe
-- reste interdite. Idempotent, re-jouable.

create or replace function public.normalize_order_customer_phone()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_country_code text;
begin
  select s.country_code into v_country_code
    from public.shops s
    where s.id = new.shop_id;
  new.customer_phone := public.normalize_phone(new.customer_phone, v_country_code);
  return new;
end;
$$;

create or replace function public.normalize_shop_whatsapp_number()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  new.whatsapp_number := public.normalize_phone(new.whatsapp_number, new.country_code);
  return new;
end;
$$;

create or replace function public.normalize_profile_phone()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  new.phone := public.normalize_phone(new.phone, new.country_code);
  return new;
end;
$$;

revoke all on function public.normalize_order_customer_phone() from public, anon, authenticated;
revoke all on function public.normalize_shop_whatsapp_number() from public, anon, authenticated;
revoke all on function public.normalize_profile_phone() from public, anon, authenticated;
