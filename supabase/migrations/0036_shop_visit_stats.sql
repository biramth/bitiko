-- Merchant-facing visit counters for the dashboard. RLS on page_views already
-- lets an owner read their own rows, but "distinct visitors" can't be had from
-- a PostgREST head-count, so expose a gated SECURITY DEFINER helper instead.
-- A caller who is neither the owner nor a platform admin simply reads zeros.
create or replace function public.get_shop_visit_stats(p_shop_id uuid)
returns table (visits_today bigint, visits_30d bigint, visitors_30d bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) filter (where pv.created_at >= date_trunc('day', now())) as visits_today,
    count(*) filter (where pv.created_at >= now() - interval '30 days') as visits_30d,
    count(distinct pv.session_id) filter (where pv.created_at >= now() - interval '30 days') as visitors_30d
  from public.page_views pv
  where pv.shop_id = p_shop_id
    and exists (
      select 1
      from public.shops s
      where s.id = p_shop_id
        and (s.owner_id = (select auth.uid()) or public.is_platform_admin())
    );
$$;

revoke all on function public.get_shop_visit_stats(uuid) from public, anon;
grant execute on function public.get_shop_visit_stats(uuid) to authenticated;
