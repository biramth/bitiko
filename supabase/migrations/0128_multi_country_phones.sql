-- 0128 : numéros de téléphone multi-pays (Afrique de l'Ouest).
--
-- `normalize_sn_phone()` (0063) n'acceptait que le Sénégal : un commerçant ou un
-- client ivoirien, malien, béninois… ne pouvait ni créer de boutique (WhatsApp
-- normalisé par trigger) ni commander. `normalize_phone(numéro, pays)` :
--   * accepte tout numéro international « +<indicatif> » d'un pays supporté ;
--   * lit les formats locaux dans le pays de la boutique (défaut SN) ;
--   * garde à l'identique les règles sénégalaises (préfixe 3/7, « 0 » de ligne).
-- Miroir de src/config/countries.ts + src/utils/phone.ts (modifier les deux).
-- Les triggers commandes / WhatsApp boutique / profils passent à normalize_phone ;
-- les réservations lisent le pays de `booking_settings`. `normalize_sn_phone`
-- reste en place (compat). Idempotent, re-exécutable.

create or replace function public.phone_country_specs()
returns table (country text, dial text, lens integer[], trunk boolean, tz text)
language sql
immutable
as $$
  select * from (values
    ('SN', '221', array[9],    true,  'Africa/Dakar'),
    ('CI', '225', array[10],   false, 'Africa/Abidjan'),
    ('ML', '223', array[8],    false, 'Africa/Bamako'),
    ('BF', '226', array[8],    false, 'Africa/Ouagadougou'),
    ('BJ', '229', array[8,10], false, 'Africa/Porto-Novo'),
    ('TG', '228', array[8],    false, 'Africa/Lome'),
    ('NE', '227', array[8],    false, 'Africa/Niamey'),
    ('GN', '224', array[9],    false, 'Africa/Conakry'),
    ('NG', '234', array[10],   true,  'Africa/Lagos'),
    ('GH', '233', array[9],    true,  'Africa/Accra')
  ) as v(country, dial, lens, trunk, tz);
$$;

create or replace function public.normalize_phone(p_phone text, p_country text default 'SN')
returns text
language plpgsql
immutable
as $$
declare
  v_cleaned text;
  v_has_plus boolean;
  v_rest text;
  v_home record;
  v_intl record;
  v_national text;
begin
  if p_phone is null or length(trim(p_phone)) = 0 then
    return null;
  end if;

  v_cleaned := regexp_replace(trim(p_phone), '[\s.\-()]', '', 'g');
  if left(v_cleaned, 2) = '00' then
    v_cleaned := '+' || substring(v_cleaned from 3);
  end if;
  v_has_plus := left(v_cleaned, 1) = '+';
  v_rest := case when v_has_plus then substring(v_cleaned from 2) else v_cleaned end;

  if v_rest !~ '^[0-9]+$' then
    raise exception 'invalid phone number: %', p_phone using errcode = '22023';
  end if;

  select * into v_home from public.phone_country_specs() s where s.country = upper(coalesce(p_country, 'SN'));
  if not found then
    select * into v_home from public.phone_country_specs() s where s.country = 'SN';
  end if;

  -- Forme internationale, ou indicatif du pays typé sans « + ».
  select * into v_intl from public.phone_country_specs() s where left(v_rest, length(s.dial)) = s.dial limit 1;
  if found and (v_has_plus or (v_intl.country = v_home.country and length(v_rest) > v_home.lens[1] + 1)) then
    v_national := substring(v_rest from length(v_intl.dial) + 1);
    if length(v_national) = any (v_intl.lens) then
      if v_intl.country = 'SN' and v_national !~ '^[37][0-9]{8}$' then
        raise exception 'invalid phone number: %', p_phone using errcode = '22023';
      end if;
      return '+' || v_intl.dial || v_national;
    end if;
  end if;
  if v_has_plus then
    raise exception 'invalid phone number: %', p_phone using errcode = '22023';
  end if;

  -- Forme locale, lue dans le pays de la boutique.
  if v_home.trunk and left(v_rest, 1) = '0' and length(v_rest) - 1 = any (v_home.lens) then
    v_national := substring(v_rest from 2);
  elsif length(v_rest) = any (v_home.lens) then
    v_national := v_rest;
  else
    raise exception 'invalid phone number: %', p_phone using errcode = '22023';
  end if;
  if v_home.country = 'SN' and v_national !~ '^[37][0-9]{8}$' then
    raise exception 'invalid phone number: %', p_phone using errcode = '22023';
  end if;
  return '+' || v_home.dial || v_national;
end;
$$;

-- ── Triggers : commandes, WhatsApp boutique, profils ──────────────────────

create or replace function public.normalize_order_customer_phone()
returns trigger
language plpgsql
as $$
begin
  new.customer_phone := public.normalize_phone(
    new.customer_phone,
    coalesce((select b.country_code from public.booking_settings b where b.shop_id = new.shop_id), 'SN')
  );
  return new;
end;
$$;

create or replace function public.normalize_shop_whatsapp_number()
returns trigger
language plpgsql
as $$
begin
  new.whatsapp_number := public.normalize_phone(new.whatsapp_number, 'SN');
  return new;
end;
$$;

create or replace function public.normalize_profile_phone()
returns trigger
language plpgsql
as $$
begin
  new.phone := public.normalize_phone(new.phone, 'SN');
  return new;
end;
$$;

-- ── Réservations : pays de la boutique ────────────────────────────────────

create or replace function public.booking_normalize_phone(p_shop_id uuid, p_phone text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public.normalize_phone(
    p_phone,
    coalesce((select b.country_code from public.booking_settings b where b.shop_id = p_shop_id), 'SN')
  );
$$;

revoke all on function public.booking_normalize_phone(uuid, text) from public, anon, authenticated;
