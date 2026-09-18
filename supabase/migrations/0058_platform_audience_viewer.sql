-- platform_audience is SECURITY DEFINER and previously gated itself on
-- auth.uid(). The Vercel handlers call it through the service-role client,
-- where auth.uid() is always NULL (no user JWT, no sub claim), so it always
-- raised 'Accès réservé.' — the campaign tool could never preview its audience
-- nor compute reachable recipients for a send.
--
-- Add a `viewer` argument: the handler has already verified the caller is a
-- platform member (getPlatformMemberFromAuthHeader), so it passes the member's
-- user id. Direct PostgREST calls without viewer still fall back to auth.uid().

create or replace function public.platform_audience(
  audience jsonb default '{}'::jsonb,
  viewer uuid default null
)
returns table (
  shop_id uuid,
  owner_id uuid,
  shop_name text,
  slug text,
  currency text,
  plan text,
  vibe text
)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_vibe text := coalesce(audience->>'vibe', 'any');
  v_plan text := coalesce(audience->>'plan', 'any');
  v_logo text := coalesce(audience->>'logo', 'any');
  v_products text := coalesce(audience->>'products', 'any');
  v_days integer := nullif(audience->>'created_within_days', '')::integer;
begin
  if not (
    (viewer is null and public.is_platform_admin())
    or
    (viewer is not null and exists (
      select 1 from public.platform_members m where m.user_id = viewer
    ))
  ) then
    raise exception 'Accès réservé.';
  end if;

  return query
    select
      s.id, s.owner_id, s.name, s.slug, s.currency,
      coalesce(sub.plan, 'free') as plan,
      s.vibe
    from public.shops s
    left join public.shop_subscriptions sub on sub.shop_id = s.id
    where
      (v_vibe = 'any'
        or (v_vibe = 'missing' and s.vibe is null)
        or (v_vibe = 'set' and s.vibe is not null))
      and (v_plan = 'any'
        or (v_plan = 'paid' and coalesce(sub.plan, 'free') <> 'free' and coalesce(sub.status, 'none') = 'active')
        or (v_plan = 'free' and coalesce(sub.plan, 'free') = 'free')
        or (v_plan in ('essential', 'pro') and coalesce(sub.plan, 'free') = v_plan))
      and (v_logo = 'any'
        or (v_logo = 'has' and coalesce(s.logo_url, '') <> '')
        or (v_logo = 'none' and coalesce(s.logo_url, '') = ''))
      and (v_products = 'any'
        or (v_products = 'has' and exists (select 1 from public.products p where p.shop_id = s.id))
        or (v_products = 'none' and not exists (select 1 from public.products p where p.shop_id = s.id)))
      and (v_days is null or s.created_at >= now() - make_interval(days => v_days))
    order by s.created_at desc;
end;
$function$;