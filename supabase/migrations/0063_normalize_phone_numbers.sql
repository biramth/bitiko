-- 0054: canonical phone storage ("+221XXXXXXXXX"), enforced server-side.
--
-- Customers and merchants type Senegalese phone numbers in many shapes
-- ("77 123 45 67", "77-123-45-67", "771234567", "+221 77 123 45 67",
-- "00221 77 123 45 67"...). The frontend already normalizes and validates
-- with src/utils/phone.ts before it ever calls the backend, but that must
-- never be the *only* gate: this migration adds the same normalization as
-- a Postgres function plus a BEFORE INSERT/UPDATE trigger on every
-- phone-bearing column (orders.customer_phone, shops.whatsapp_number,
-- profiles.phone), so the canonical form is guaranteed no matter which
-- code path writes it — the create_order() RPC, or a direct authenticated
-- table update from Settings/Onboarding.
--
-- normalize_sn_phone() raises an exception on anything it can't confidently
-- normalize, exactly like the frontend equivalent, so a malformed number
-- is rejected rather than silently stored as-is or mangled.

create or replace function public.normalize_sn_phone(p_phone text)
returns text
language plpgsql
immutable
as $$
declare
  v_cleaned text;
  v_digits text;
  v_national text;
begin
  if p_phone is null or length(trim(p_phone)) = 0 then
    return null;
  end if;

  -- Drop spaces, dots, dashes and parentheses; a leading "00" means "+".
  v_cleaned := regexp_replace(trim(p_phone), '[\s.\-()]', '', 'g');
  if left(v_cleaned, 2) = '00' then
    v_cleaned := '+' || substring(v_cleaned from 3);
  end if;

  if left(v_cleaned, 1) = '+' then
    v_digits := substring(v_cleaned from 2);
  else
    v_digits := v_cleaned;
  end if;

  if v_digits !~ '^[0-9]+$' then
    raise exception 'invalid phone number: %', p_phone using errcode = '22023';
  end if;

  if left(v_digits, 3) = '221' and length(v_digits) = 12 then
    v_national := substring(v_digits from 4);
  elsif length(v_digits) = 10 and left(v_digits, 1) = '0' then
    -- Local habit of dialling with a leading trunk "0" (not part of the plan).
    v_national := substring(v_digits from 2);
  elsif length(v_digits) = 9 then
    v_national := v_digits;
  else
    raise exception 'invalid phone number: %', p_phone using errcode = '22023';
  end if;

  -- Senegalese numbers start with 7 (mobile) or 3 (fixed line).
  if v_national !~ '^[37][0-9]{8}$' then
    raise exception 'invalid phone number: %', p_phone using errcode = '22023';
  end if;

  return '+221' || v_national;
end;
$$;

create or replace function public.normalize_order_customer_phone()
returns trigger
language plpgsql
as $$
begin
  new.customer_phone := public.normalize_sn_phone(new.customer_phone);
  return new;
end;
$$;

create trigger orders_normalize_customer_phone
  before insert or update of customer_phone on public.orders
  for each row execute function public.normalize_order_customer_phone();

create or replace function public.normalize_shop_whatsapp_number()
returns trigger
language plpgsql
as $$
begin
  new.whatsapp_number := public.normalize_sn_phone(new.whatsapp_number);
  return new;
end;
$$;

create trigger shops_normalize_whatsapp_number
  before insert or update of whatsapp_number on public.shops
  for each row execute function public.normalize_shop_whatsapp_number();

create or replace function public.normalize_profile_phone()
returns trigger
language plpgsql
as $$
begin
  new.phone := public.normalize_sn_phone(new.phone);
  return new;
end;
$$;

create trigger profiles_normalize_phone
  before insert or update of phone on public.profiles
  for each row execute function public.normalize_profile_phone();

-- Backfill existing rows to the canonical form. Each row is normalized
-- individually (its own exception block/savepoint) so one bad legacy
-- value can't abort the whole migration — it's logged with NOTICE instead
-- and left untouched for a human to review and fix manually.

do $$
declare
  r record;
  v_normalized text;
begin
  for r in select id, customer_phone from public.orders loop
    begin
      v_normalized := public.normalize_sn_phone(r.customer_phone);
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
  for r in select id, whatsapp_number from public.shops loop
    begin
      v_normalized := public.normalize_sn_phone(r.whatsapp_number);
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
  for r in select id, phone from public.profiles where phone is not null loop
    begin
      v_normalized := public.normalize_sn_phone(r.phone);
      if v_normalized is distinct from r.phone then
        update public.profiles set phone = v_normalized where id = r.id;
      end if;
    exception when others then
      raise notice 'profiles.phone: could not normalize row % (value: %) — left untouched, needs manual review', r.id, r.phone;
    end;
  end loop;
end $$;
