-- Security fix: plan limits (max active products, max custom pages) were
-- only enforced in the React UI (src/config/plans.ts + ProductFormPage.tsx /
-- StoreBuilderPage.tsx). Nothing stopped an authenticated shop owner from
-- calling the Supabase REST API directly (their own session + the public
-- anon key, both always visible in the browser's network tab) to insert past
-- those limits — effectively getting Essential/Pro-tier capacity on the free
-- plan without ever paying. This migration moves enforcement into the
-- database itself, where RLS already gates *who* can write but never *how
-- much*.
--
-- Limits are hardcoded here to mirror src/config/plans.ts's PLANS table.
-- If those numbers ever change, update both places.

create or replace function public.effective_plan_key(p_shop_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when s.plan is null then 'free'
    when s.plan = 'free' then 'free'
    when s.current_period_end is null then 'free'
    when s.current_period_end > now() then s.plan
    else 'free'
  end
  from (select 1) as one
  left join public.shop_subscriptions s on s.shop_id = p_shop_id;
$$;

create or replace function public.plan_max_active_products(p_plan text)
returns integer
language sql
immutable
as $$
  select case p_plan
    when 'essential' then 50
    when 'pro' then null
    else 8 -- free
  end;
$$;

create or replace function public.plan_max_custom_pages(p_plan text)
returns integer
language sql
immutable
as $$
  select case p_plan
    when 'essential' then 5
    when 'pro' then null
    else 1 -- free
  end;
$$;

-- products: block activating a product past the plan's active-product cap.
create or replace function public.enforce_product_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_max integer;
  v_count integer;
begin
  if not new.active then
    return new;
  end if;

  v_plan := public.effective_plan_key(new.shop_id);
  v_max := public.plan_max_active_products(v_plan);
  if v_max is null then
    return new;
  end if;

  select count(*) into v_count
  from public.products
  where shop_id = new.shop_id and active = true and id <> new.id;

  if v_count >= v_max then
    raise exception 'plan_limit_exceeded: le plan actuel autorise au maximum % produits actifs', v_max
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists products_enforce_plan_limit on public.products;
create trigger products_enforce_plan_limit
  before insert or update of active, shop_id on public.products
  for each row execute function public.enforce_product_limit();

-- pages: block creating a custom page past the plan's page cap.
create or replace function public.enforce_page_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_max integer;
  v_count integer;
begin
  v_plan := public.effective_plan_key(new.shop_id);
  v_max := public.plan_max_custom_pages(v_plan);
  if v_max is null then
    return new;
  end if;

  select count(*) into v_count
  from public.pages
  where shop_id = new.shop_id;

  if v_count >= v_max then
    raise exception 'plan_limit_exceeded: le plan actuel autorise au maximum % pages personnalisées', v_max
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists pages_enforce_plan_limit on public.pages;
create trigger pages_enforce_plan_limit
  before insert on public.pages
  for each row execute function public.enforce_page_limit();
