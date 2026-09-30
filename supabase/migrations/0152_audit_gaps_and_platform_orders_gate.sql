-- 0152_audit_gaps_and_platform_orders_gate.sql
--
-- 1. Nouvelles actions traçables : team_update, team_remove, country_set,
--    campaign_send (voir api/admin/platform.ts et api/_lib/auditLog.ts).
-- 2. get_platform_orders() expose nom + téléphone des clients finaux : son
--    accès est restreint aux rôles owner/admin/dev (plus de marketing).
--
-- Idempotent, re-jouable.

alter table public.admin_audit_log drop constraint if exists admin_audit_log_action_check;
alter table public.admin_audit_log
  add constraint admin_audit_log_action_check
  check (action in (
    'support_access', 'user_delete', 'team_add', 'team_update', 'team_remove',
    'biztype_save', 'payment_approve', 'payment_reject', 'promo_save',
    'template_save', 'subscription_grant', 'shop_suspend', 'shop_unsuspend',
    'country_set', 'campaign_send'
  ));

create or replace function public.get_platform_orders(p_limit integer default 20)
returns table (
  id uuid,
  order_number text,
  shop_id uuid,
  shop_name text,
  shop_slug text,
  customer_name text,
  customer_phone text,
  total numeric,
  status text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if not public.is_platform_admin() then
    raise exception 'Accès réservé.';
  end if;
  select m.role into v_role
    from public.platform_members m
   where m.user_id = auth.uid();
  if v_role is distinct from 'owner' and v_role is distinct from 'admin' and v_role is distinct from 'dev' then
    raise exception 'Accès réservé.';
  end if;

  return query
    select
      o.id, o.order_number, o.shop_id, s.name, s.slug,
      o.customer_name, o.customer_phone, o.total, o.status, o.created_at
    from public.orders o
    join public.shops s on s.id = o.shop_id
    order by o.created_at desc
    limit greatest(1, least(coalesce(p_limit, 20), 100));
end;
$$;

revoke all on function public.get_platform_orders(integer) from public, anon;
grant execute on function public.get_platform_orders(integer) to authenticated;
