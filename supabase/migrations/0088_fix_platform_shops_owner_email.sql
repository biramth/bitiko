-- ---------------------------------------------------------------------------
-- Fix get_platform_shops: auth.users.email est varchar(255), mais la colonne
-- 13 (owner_email) est déclarée text. Le RETURN QUERY relève alors
-- « structure of query does not match function result type » à chaque appel
-- (bug introduit par 0086). Cast explicite ::text sur le sous-énoncé.
-- ---------------------------------------------------------------------------

create or replace function public.get_platform_shops()
returns table (
  id uuid,
  name text,
  slug text,
  whatsapp_number text,
  currency text,
  created_at timestamptz,
  products bigint,
  orders bigint,
  revenue numeric,
  plan text,
  plan_status text,
  owner_id uuid,
  owner_email text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Accès réservé.';
  end if;

  return query
    select
      s.id, s.name, s.slug, s.whatsapp_number, s.currency, s.created_at,
      (select count(*) from public.products p where p.shop_id = s.id) as products,
      (select count(*) from public.orders o where o.shop_id = s.id) as orders,
      (select coalesce(sum(o.total), 0) from public.orders o where o.shop_id = s.id and o.status <> 'cancelled') as revenue,
      coalesce(sub.plan, 'free') as plan,
      coalesce(sub.status, 'none') as plan_status,
      s.owner_id,
      (select u.email::text from auth.users u where u.id = s.owner_id) as owner_email
    from public.shops s
    left join public.shop_subscriptions sub on sub.shop_id = s.id
    order by s.created_at desc;
end;
$$;

revoke all on function public.get_platform_shops() from public, anon;
grant execute on function public.get_platform_shops() to authenticated;