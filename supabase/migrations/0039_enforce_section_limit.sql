-- Security fix: the plan cap on freely-addable content blocks per page
-- (Plan.maxCustomSections in src/config/plans.ts) was only enforced in the
-- React builder UI — BuilderSidebar.tsx greys out "+ Ajouter un bloc" once
-- the limit is reached. Nothing stopped a shop owner from calling the
-- Supabase REST API directly (their own session + the public anon key) to
-- write a layout_sections/builder_draft/pages content array with more
-- content blocks than their plan allows — the same class of bypass that
-- 0027_enforce_plan_limits_server_side.sql closed for maxActiveProducts and
-- maxCustomPages. This migration closes it for maxCustomSections too.
--
-- Limits mirror src/config/plans.ts's PLANS table; if those numbers change,
-- update both places.

create or replace function public.plan_max_custom_sections(p_plan text)
returns integer
language sql
immutable
as $$
  select case p_plan
    when 'essential' then 10
    when 'pro' then null
    else 3 -- free
  end;
$$;

-- The section types a merchant can add freely to any page (category
-- 'content', not pinned) — mirrors CORE_SECTION_REGISTRY /
-- TEMPLATE_EXTRA_SECTIONS in src/features/store-builder/sectionRegistry.tsx
-- and templateSections.ts. Catalog-display blocks (categories, products,
-- featured_products) and fixed singletons (header, footer, product, cart,
-- checkout) are never limited, so they're deliberately excluded here.
create or replace function public.count_custom_sections(p_sections jsonb)
returns integer
language sql
immutable
as $$
  select count(*)::integer
  from jsonb_array_elements(coalesce(p_sections, '[]'::jsonb)) as section
  where section->>'type' in ('hero', 'text', 'image', 'promo', 'faq', 'lookbook');
$$;

-- shops: block writing more content blocks than the plan allows into any of
-- the four places a shop's pages live — the published home page
-- (layout_sections), the working home draft (builder_draft->sections), the
-- four published system pages (page_templates.<key>.published — catalogue,
-- product, cart, checkout) and their working drafts
-- (builder_draft->templates-><key>). BuilderSidebar's maxCustomSections cap
-- applies uniformly no matter which of these pages is open in the builder
-- (see BuilderEditor in StoreBuilderPage.tsx), so every one of them needs
-- the same server-side guard.
create or replace function public.enforce_shop_section_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_max integer;
  v_key text;
begin
  v_plan := public.effective_plan_key(new.id);
  v_max := public.plan_max_custom_sections(v_plan);
  if v_max is null then
    return new;
  end if;

  if public.count_custom_sections(new.layout_sections) > v_max then
    raise exception 'plan_limit_exceeded: le plan actuel autorise au maximum % blocs de contenu par page', v_max
      using errcode = '23514';
  end if;

  if public.count_custom_sections(new.builder_draft->'sections') > v_max then
    raise exception 'plan_limit_exceeded: le plan actuel autorise au maximum % blocs de contenu par page', v_max
      using errcode = '23514';
  end if;

  for v_key in select jsonb_object_keys(coalesce(new.page_templates, '{}'::jsonb))
  loop
    if public.count_custom_sections(new.page_templates->v_key->'published') > v_max then
      raise exception 'plan_limit_exceeded: le plan actuel autorise au maximum % blocs de contenu par page', v_max
        using errcode = '23514';
    end if;
  end loop;

  for v_key in select jsonb_object_keys(coalesce(new.builder_draft->'templates', '{}'::jsonb))
  loop
    if public.count_custom_sections(new.builder_draft->'templates'->v_key) > v_max then
      raise exception 'plan_limit_exceeded: le plan actuel autorise au maximum % blocs de contenu par page', v_max
        using errcode = '23514';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists shops_enforce_section_limit on public.shops;
create trigger shops_enforce_section_limit
  before insert or update of layout_sections, builder_draft, page_templates on public.shops
  for each row execute function public.enforce_shop_section_limit();

-- pages: same cap, applied to a custom page's published and draft content.
create or replace function public.enforce_page_section_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_max integer;
begin
  v_plan := public.effective_plan_key(new.shop_id);
  v_max := public.plan_max_custom_sections(v_plan);
  if v_max is null then
    return new;
  end if;

  if public.count_custom_sections(new.content) > v_max then
    raise exception 'plan_limit_exceeded: le plan actuel autorise au maximum % blocs de contenu par page', v_max
      using errcode = '23514';
  end if;

  if public.count_custom_sections(new.draft_content) > v_max then
    raise exception 'plan_limit_exceeded: le plan actuel autorise au maximum % blocs de contenu par page', v_max
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists pages_enforce_section_limit on public.pages;
create trigger pages_enforce_section_limit
  before insert or update of content, draft_content on public.pages
  for each row execute function public.enforce_page_section_limit();
