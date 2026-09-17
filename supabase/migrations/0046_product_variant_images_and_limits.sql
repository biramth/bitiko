-- Variant photos: product_variants.image_url (one image per variant). The free
-- plan ("Découverte") caps a product at 3 photos total — 1 main product photo,
-- and if variants exist, 1 photo per variant with at most 2 variants — so
-- 3 = 1 + 2. Paid plans are unlimited.
--
-- The image/variant caps are enforced in the database (same rationale as
-- migration 0027): the React UI can block nice-to-have UX, but a shop owner
-- can always call the REST API directly with their own session, so the limits
-- must live in triggers too. Numbers mirror src/config/plans.ts's PLANS table;
-- if they change, update both places.

alter table public.product_variants
  add column image_url text;

create or replace function public.plan_max_product_images(p_plan text)
returns integer
language sql
immutable
as $$
  select case p_plan
    when 'essentiel' then null
    when 'pro' then null
    else 3 -- free: 1 main photo + up to 2 variant photos
  end;
$$;

create or replace function public.plan_max_variants(p_plan text)
returns integer
language sql
immutable
as $$
  select case p_plan
    when 'essential' then null
    when 'pro' then null
    else 2 -- free
  end;
$$;

-- Total photo budget check shared by product_images and variant image rows:
-- free plan = 3 = product photos + variant photos combined.
create or replace function public.count_product_photos(p_product_id uuid)
returns integer
language sql
stable
as $$
  select
    (select count(*) from public.product_images where product_id = p_product_id) +
    (select count(*) from public.product_variants where product_id = p_product_id and image_url is not null);
$$;

-- product_images: block inserting a photo once the plan's photo budget is full.
create or replace function public.enforce_product_photo_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop uuid;
  v_plan text;
  v_max integer;
  v_count integer;
begin
  select shop_id into v_shop from public.products where id = new.product_id;
  if v_shop is null then
    return new;
  end if;

  v_plan := public.effective_plan_key(v_shop);
  v_max := public.plan_max_product_images(v_plan);
  if v_max is null then
    return new;
  end if;

  v_count := public.count_product_photos(new.product_id);
  if v_count >= v_max then
    raise exception 'plan_limit_exceeded: le plan actuel autorise au maximum % photos par produit', v_max
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists product_images_enforce_plan_limit on public.product_images;
create trigger product_images_enforce_plan_limit
  before insert on public.product_images
  for each row execute function public.enforce_product_photo_limit();

-- product_variants: block creating more variants than the plan allows, and
-- block assigning a variant photo once the shared photo budget is full
-- (a variant photo consumes one of the free plan's 3 slots).
create or replace function public.enforce_variant_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop uuid;
  v_plan text;
  v_max_variants integer;
  v_max_photos integer;
  v_variant_count integer;
  v_photo_count integer;
begin
  select shop_id into v_shop from public.products where id = new.product_id;
  if v_shop is null then
    return new;
  end if;

  v_plan := public.effective_plan_key(v_shop);

  if tg_op = 'INSERT' then
    v_max_variants := public.plan_max_variants(v_plan);
    if v_max_variants is not null then
      select count(*) into v_variant_count
      from public.product_variants
      where product_id = new.product_id;
      if v_variant_count >= v_max_variants then
        raise exception 'plan_limit_exceeded: le plan actuel autorise au maximum % variantes', v_max_variants
          using errcode = '23514';
      end if;
    end if;
  end if;

  if new.image_url is not null then
    v_max_photos := public.plan_max_product_images(v_plan);
    if v_max_photos is not null then
      v_photo_count := public.count_product_photos(new.product_id);
      -- EXCLUDE this row: on UPDATE replacing an existing variant's own photo
      -- it is already counted (on INSERT new.id is null and matches nothing).
      v_photo_count := v_photo_count - (select count(*) from public.product_variants where id = new.id and image_url is not null);
      if v_photo_count >= v_max_photos then
        raise exception 'plan_limit_exceeded: le plan actuel autorise au maximum % photos par produit', v_max_photos
          using errcode = '23514';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists product_variants_enforce_plan_limit on public.product_variants;
create trigger product_variants_enforce_plan_limit
  before insert or update of image_url on public.product_variants
  for each row execute function public.enforce_variant_limits();

-- Hardening (same pattern as migration 0028): these are trigger helpers, never
-- meant to be called directly via /rest/v1/rpc — firing as a trigger doesn't
-- require the invoking role to hold EXECUTE.
alter function public.plan_max_product_images(text) set search_path = pg_catalog;
alter function public.plan_max_variants(text) set search_path = pg_catalog;
alter function public.count_product_photos(uuid) set search_path = pg_catalog;

revoke execute on function public.enforce_product_photo_limit() from public, anon, authenticated;
revoke execute on function public.enforce_variant_limits() from public, anon, authenticated;
revoke execute on function public.plan_max_product_images(text) from public, anon, authenticated;
revoke execute on function public.plan_max_variants(text) from public, anon, authenticated;
revoke execute on function public.count_product_photos(uuid) from public, anon, authenticated;