-- 0128 : pays, devises et normalisation des téléphones multi-pays.
--
-- Fusion du chantier « countries » (ex-0055/0056 du stash pr1-wip-backup-develop,
-- déjà appliqué à la main sur la base dev) dans la chaîne officielle. TOUT est
-- idempotent : sur dev (objets déjà présents) ce fichier converge sans erreur,
-- sur une base neuve (prod) il crée le modèle complet.
--
--   * `currencies` / `countries` : pays ouverts (`is_enabled`, décidé par
--     l'admin plateforme — outil « Pays »), règles de numérotation, devise ;
--   * `shops.country_code` / `profiles.country_code` (défaut 'SN') ;
--   * `normalize_phone(numéro, pays)` remplace `normalize_sn_phone` ; les
--     triggers commandes / WhatsApp boutique / profils y sont re-pointés
--     (commandes : pays de la boutique) ;
--   * `booking_normalize_phone(boutique, numéro)` (réservations, 0122) lit le
--     pays de la boutique ;
--   * durcissement (ex-0055) : search_path figé, fonctions internes retirées de
--     l'API RPC.
-- Le normaliseur ignore volontairement `is_enabled` : une boutique dans un pays
-- refermé continue de fonctionner.

create table if not exists public.currencies (
  code text primary key check (code ~ '^[A-Z]{3}$'),
  name text not null,
  symbol text not null,
  decimal_digits integer not null default 0 check (decimal_digits between 0 and 4),
  created_at timestamptz not null default now()
);

create table if not exists public.countries (
  code text primary key check (code ~ '^[A-Z]{2}$'),
  name text not null,
  dial_code text not null check (dial_code ~ '^\+[0-9]{1,4}$'),
  trunk_prefix text not null default '0',
  national_number_length integer not null check (national_number_length between 6 and 15),
  national_regex text not null,
  currency_code text not null references public.currencies(code),
  is_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.currencies enable row level security;
alter table public.countries enable row level security;

-- Lecture publique (configuration, pas de donnée tenant) ; écritures via
-- l'endpoint plateforme (service role) : aucune policy d'écriture.
drop policy if exists "currencies: public read" on public.currencies;
create policy "currencies: public read" on public.currencies for select using (true);

drop policy if exists "countries: public read" on public.countries;
create policy "countries: public read" on public.countries for select using (true);

-- Seed: the currencies the seeded countries reference.
insert into public.currencies (code, name, symbol, decimal_digits) values
  ('XOF', 'Franc CFA (BCEAO)', 'FCFA', 0),
  ('XAF', 'Franc CFA (BEAC)', 'FCFA', 0),
  ('GNF', 'Franc guinéen', 'GNF', 0),
  ('GHS', 'Cedi ghanéen', 'GHS', 2),
  ('NGN', 'Naira nigérian', 'NGN', 2),
  ('RWF', 'Franc rwandais', 'RWF', 0),
  ('KES', 'Shilling kényan', 'KES', 2),
  ('MAD', 'Dirham marocain', 'MAD', 2),
  ('EUR', 'Euro', 'EUR', 2),
  ('CDF', 'Franc congolais', 'CDF', 2),
  ('MGA', 'Ariary malgache', 'MGA', 0),
  ('ZAR', 'Rand sud-africain', 'ZAR', 2)
on conflict (code) do nothing;

-- Seed: Africa-first, with France present but disabled (Europe comes later).
insert into public.countries (code, name, dial_code, trunk_prefix, national_number_length, national_regex, currency_code, is_enabled) values
  ('SN', 'Sénégal',             '+221', '0',  9,  '^[37][0-9]{8}$',   'XOF', true),
  ('CI', 'Côte d''Ivoire',      '+225', '0',  8,  '^[0-9]{8}$',       'XOF', false),
  ('ML', 'Mali',                '+223', '0',  8,  '^[0-9]{8}$',       'XOF', false),
  ('BF', 'Burkina Faso',        '+226', '0',  8,  '^[67][0-9]{7}$',   'XOF', false),
  ('GN', 'Guinée',              '+224', '0',  9,  '^[0-9]{9}$',       'GNF', false),
  ('TG', 'Togo',                '+228', '0',  8,  '^[0-9]{8}$',       'XOF', false),
  ('BJ', 'Bénin',               '+229', '0',  8,  '^[0-9]{8}$',       'XOF', false),
  ('NE', 'Niger',               '+227', '0',  8,  '^[0-9]{8}$',       'XOF', false),
  ('CM', 'Cameroun',            '+237', '0',  9,  '^[0-9]{9}$',       'XAF', false),
  ('GA', 'Gabon',               '+241', '0',  8,  '^[0-9]{8}$',       'XAF', false),
  ('CG', 'Congo-Brazzaville',   '+242', '0',  9,  '^[0-9]{9}$',       'XAF', false),
  ('CD', 'RD Congo',            '+243', '0',  9,  '^[0-9]{9}$',       'CDF', false),
  ('MG', 'Madagascar',          '+261', '0',  9,  '^[0-9]{9}$',       'MGA', false),
  ('RW', 'Rwanda',              '+250', '0',  9,  '^[0-9]{9}$',       'RWF', false),
  ('KE', 'Kenya',               '+254', '0',  9,  '^[0-9]{9}$',       'KES', false),
  ('GH', 'Ghana',               '+233', '0',  9,  '^[0-9]{9}$',       'GHS', false),
  ('NG', 'Nigeria',             '+234', '0', 10,  '^[0-9]{10}$',      'NGN', false),
  ('MA', 'Maroc',               '+212', '0',  9,  '^[0-9]{9}$',       'MAD', false),
  ('FR', 'France',              '+33',  '0',  9,  '^[1-9][0-9]{8}$',  'EUR', false),
  ('ZA', 'Afrique du Sud',      '+27',  '0',  9,  '^[0-9]{9}$',       'ZAR', false)
on conflict (code) do nothing;

-- Fuseau horaire par défaut des créneaux de réservation (effective_booking_settings).
alter table public.countries add column if not exists timezone text not null default 'Africa/Dakar';

update public.countries c
set timezone = v.tz
from (values
    ('SN', 'Africa/Dakar'),
    ('CI', 'Africa/Abidjan'),
    ('ML', 'Africa/Bamako'),
    ('BF', 'Africa/Ouagadougou'),
    ('GN', 'Africa/Conakry'),
    ('TG', 'Africa/Lome'),
    ('BJ', 'Africa/Porto-Novo'),
    ('NE', 'Africa/Niamey'),
    ('CM', 'Africa/Douala'),
    ('GA', 'Africa/Libreville'),
    ('CG', 'Africa/Brazzaville'),
    ('CD', 'Africa/Kinshasa'),
    ('MG', 'Indian/Antananarivo'),
    ('RW', 'Africa/Kigali'),
    ('KE', 'Africa/Nairobi'),
    ('GH', 'Africa/Accra'),
    ('NG', 'Africa/Lagos'),
    ('MA', 'Africa/Casablanca'),
    ('FR', 'Europe/Paris'),
    ('ZA', 'Africa/Johannesburg')
) as v(code, tz)
where c.code = v.code;

-- Pays d'une boutique et d'un profil. Les lignes existantes passent à 'SN'.
alter table public.shops
  add column if not exists country_code text not null default 'SN' references public.countries(code);
alter table public.profiles
  add column if not exists country_code text not null default 'SN' references public.countries(code);

create index if not exists idx_shops_country_code on public.shops (country_code);
create index if not exists idx_profiles_country_code on public.profiles (country_code);

-- ---------------------------------------------------------------------------
-- Generic phone normalizer (mirrors src/utils/phone.ts). `normalize_sn_phone`
-- from 0054 is replaced; the triggers it powered are re-pointed at the
-- country-aware version. Rules come from the `countries` row.
-- ---------------------------------------------------------------------------

create or replace function public.normalize_phone(p_phone text, p_country_code text)
returns text
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_country record;
  v_dial text;
  v_cleaned text;
  v_digits text;
  v_national text;
begin
  if p_phone is null or length(trim(p_phone)) = 0 then
    return null;
  end if;

  select code, dial_code, trunk_prefix, national_number_length, national_regex
    into v_country
    from public.countries
    where code = upper(coalesce(nullif(p_country_code, ''), 'SN'));
  if v_country.code is null then
    raise exception 'unknown phone country: %', p_country_code using errcode = '22023';
  end if;

  v_dial := replace(v_country.dial_code, '+', '');

  -- Drop spaces, dots, dashes and parentheses; a leading "00" means "+".
  v_cleaned := regexp_replace(trim(p_phone), '[\s.\-()]', '', 'g');
  if left(v_cleaned, 2) = '00' then
    v_cleaned := '+' || substring(v_cleaned from 3);
  end if;

  if left(v_cleaned, 1) = '+' then
    v_digits := substring(v_cleaned from 2);
    if v_digits !~ '^[0-9]+$' then
      raise exception 'invalid phone number: %', p_phone using errcode = '22023';
    end if;
    if left(v_digits, length(v_dial)) = v_dial
       and length(v_digits) = length(v_dial) + v_country.national_number_length then
      v_national := substring(v_digits from length(v_dial) + 1);
    else
      raise exception 'invalid phone number: %', p_phone using errcode = '22023';
    end if;
  else
    v_digits := v_cleaned;
    if v_digits !~ '^[0-9]+$' then
      raise exception 'invalid phone number: %', p_phone using errcode = '22023';
    end if;
    if left(v_digits, 1) = v_country.trunk_prefix
       and length(v_digits) = v_country.national_number_length + 1 then
      -- Local habit of dialling with a leading trunk prefix (not part of the plan).
      v_national := substring(v_digits from 2);
    elsif length(v_digits) = v_country.national_number_length then
      v_national := v_digits;
    elsif left(v_digits, length(v_dial)) = v_dial
          and length(v_digits) = length(v_dial) + v_country.national_number_length
          and substring(v_digits from length(v_dial) + 1) ~ v_country.national_regex then
      -- Full international number typed without the "+", e.g. "221771234567".
      v_national := substring(v_digits from length(v_dial) + 1);
    else
      raise exception 'invalid phone number: %', p_phone using errcode = '22023';
    end if;
  end if;

  if v_national !~ v_country.national_regex then
    raise exception 'invalid phone number: %', p_phone using errcode = '22023';
  end if;

  return v_country.dial_code || v_national;
end;
$$;

revoke all on function public.normalize_phone(text, text) from public, anon, authenticated;

-- Triggers : commandes (pays de la boutique), WhatsApp boutique, profils.
create or replace function public.normalize_order_customer_phone()
returns trigger
language plpgsql
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

drop trigger if exists orders_normalize_customer_phone on public.orders;
create trigger orders_normalize_customer_phone
  before insert or update of customer_phone on public.orders
  for each row execute function public.normalize_order_customer_phone();

drop trigger if exists shops_normalize_whatsapp_number on public.shops;
create trigger shops_normalize_whatsapp_number
  before insert or update of whatsapp_number, country_code on public.shops
  for each row execute function public.normalize_shop_whatsapp_number();

drop trigger if exists profiles_normalize_phone on public.profiles;
create trigger profiles_normalize_phone
  before insert or update of phone, country_code on public.profiles
  for each row execute function public.normalize_profile_phone();

-- Le normaliseur exclusivement sénégalais (0063) est remplacé.
drop function if exists public.normalize_sn_phone(text);

-- Réservations (0122) : pays de la boutique.
create or replace function public.booking_normalize_phone(p_shop_id uuid, p_phone text)
returns text
language plpgsql
stable
as $$
declare
  v_country_code text;
begin
  select s.country_code into v_country_code from public.shops s where s.id = p_shop_id;
  return public.normalize_phone(p_phone, v_country_code);
end;
$$;

revoke all on function public.booking_normalize_phone(uuid, text) from public, anon, authenticated;

-- Réglages de réservation par défaut : fuseau du pays de la boutique (0122 fixait Dakar).
create or replace function public.effective_booking_settings(p_shop_id uuid)
returns public.booking_settings
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select b from public.booking_settings b where b.shop_id = p_shop_id),
    row(
      p_shop_id,
      coalesce((select c.timezone from public.shops s join public.countries c on c.code = s.country_code where s.id = p_shop_id), 'Africa/Dakar'),
      '09:00'::time, '19:00'::time, '{1,2,3,4,5,6}'::integer[], 30, 60, 40, 90, now()
    )::public.booking_settings
  );
$$;

revoke all on function public.effective_booking_settings(uuid) from public, anon, authenticated;

-- Durcissement (ex-0055) : search_path figé sur les fonctions concernées, si présentes.
do $$
begin
  if to_regprocedure('public.plan_max_custom_sections(text)') is not null then
    alter function public.plan_max_custom_sections(text) set search_path = pg_catalog;
  end if;
  if to_regprocedure('public.count_custom_sections(jsonb)') is not null then
    alter function public.count_custom_sections(jsonb) set search_path = pg_catalog;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Backfill to the canonical form under each row's own country. Every row is
-- normalized individually (its own exception block/savepoint) so one bad
-- legacy value can't abort the migration — it's logged with NOTICE instead
-- and left untouched for a human to review and fix manually.
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
  v_normalized text;
begin
  for r in select o.id, o.customer_phone, s.country_code as country_code
           from public.orders o
           join public.shops s on s.id = o.shop_id
  loop
    begin
      v_normalized := public.normalize_phone(r.customer_phone, r.country_code);
      if v_normalized is distinct from r.customer_phone then
        update public.orders set customer_phone = v_normalized where id = r.id;
      end if;
    exception when others then
      raise notice 'orders.customer_phone: could not normalize row % (value: %) — left untouched, needs manual review', r.id, r.customer_phone;
    end;
  end loop;
end $$;

do $$
declare
  r record;
  v_normalized text;
begin
  for r in select id, whatsapp_number, country_code from public.shops loop
    begin
      v_normalized := public.normalize_phone(r.whatsapp_number, r.country_code);
      if v_normalized is distinct from r.whatsapp_number then
        update public.shops set whatsapp_number = v_normalized where id = r.id;
      end if;
    exception when others then
      raise notice 'shops.whatsapp_number: could not normalize row % (value: %) — left untouched, needs manual review', r.id, r.whatsapp_number;
    end;
  end loop;
end $$;

do $$
declare
  r record;
  v_normalized text;
begin
  for r in select id, phone, country_code from public.profiles where phone is not null loop
    begin
      v_normalized := public.normalize_phone(r.phone, r.country_code);
      if v_normalized is distinct from r.phone then
        update public.profiles set phone = v_normalized where id = r.id;
      end if;
    exception when others then
      raise notice 'profiles.phone: could not normalize row % (value: %) — left untouched, needs manual review', r.id, r.phone;
    end;
  end loop;
end $$;