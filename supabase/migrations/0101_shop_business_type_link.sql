-- 0101_shop_business_type_link.sql — PHASE-05 Business Types activation (DB layer).
--
-- Links shops to the business_types referential WITHOUT breaking anything:
--   shops.business_type_id — nullable bridge (compat; shops.business_type TEXT
--                             stays authoritative until every flow writes the FK)
--   shop_business_type_slug(uuid) — effective type slug: FK slug when set,
--                             otherwise legacy TEXT (marked LEGACY, retrait PHASE-17)
--   business_type_capability_codes(text) — capability codes for a type slug
--                             (active type + active capabilities only)
--
-- Server-side reads for workspace (PHASE-06) and adaptive frontstore (PHASE-07).
-- No RLS change (columns inherit row policies; helpers read public referentials).
-- No frontend change in this migration. Idempotent, re-runnable.

-- Bridge column. RESTRICT: a referenced business type cannot be deleted while
-- shops point at it (types retire via status=deprecated, never by DELETE).
alter table public.shops
  add column if not exists business_type_id uuid references public.business_types(id);

comment on column public.shops.business_type_id is
  'Business-type referential link (PHASE-05+). Nullable during cohabitation; shops.business_type TEXT stays authoritative until all flows write this FK.';

create index if not exists shops_business_type_id_idx
  on public.shops (business_type_id);

-- Backfill (idempotent): legacy TEXT value → referential id. Unknown values
-- stay NULL and are reported via NOTICE (handled at type-creation time, PHASE-05
-- admin tool) — never data loss, never invented mapping.
do $$
declare
  r record;
  v_type_id uuid;
begin
  for r in
    select distinct business_type from public.shops
    where business_type is not null and business_type_id is null
  loop
    select id into v_type_id
    from public.business_types
    where slug = r.business_type
    limit 1;

    if v_type_id is null then
      raise notice 'business_type backfill: unknown legacy value "%" — left NULL', r.business_type;
    else
      update public.shops
      set business_type_id = v_type_id
      where business_type = r.business_type and business_type_id is null;
    end if;
  end loop;
end $$;

-- Effective type slug for a shop: referential first, legacy TEXT fallback.
create or replace function public.shop_business_type_slug(p_shop_id uuid)
returns text
language sql
stable
set search_path = public
as $$
  select coalesce(t.slug, s.business_type)
  from public.shops s
  left join public.business_types t on t.id = s.business_type_id
  where s.id = p_shop_id
  limit 1;
$$;

comment on function public.shop_business_type_slug(uuid) is
  'LEGACY-compat reader (PHASE-05): FK slug when set, else shops.business_type TEXT. Remove the fallback in PHASE-17.';

-- Capability codes driving workspace + frontstore adaptation (PHASE-06/07).
create or replace function public.business_type_capability_codes(p_slug text)
returns setof text
language sql
stable
set search_path = public
as $$
  select c.code
  from public.business_types t
  join public.business_type_capabilities j on j.business_type_id = t.id
  join public.capabilities c on c.id = j.capability_id
  where t.slug = p_slug
    and t.status = 'active'
    and c.status = 'active'
  order by 1;
$$;

comment on function public.business_type_capability_codes(text) is
  'Server-side capability read: active codes for an active business type. Used by workspace generator (PHASE-06) and adaptive frontstore (PHASE-07).';

-- Read-only referential helpers: callable by anyone (public data, validated
-- server-side like get_landing_promo) — explicit per-role grants.
revoke all on function public.shop_business_type_slug(uuid) from public;
grant execute on function public.shop_business_type_slug(uuid) to anon, authenticated;

revoke all on function public.business_type_capability_codes(text) from public;
grant execute on function public.business_type_capability_codes(text) to anon, authenticated;
