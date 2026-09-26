-- 0132 : pilotage plateforme (back-office de l'équipe Bitiko).
--
--  1. admin_audit_log : la liste blanche d'actions oubliait `template_save` (ses
--     écritures échouaient en silence, l'audit étant best-effort) et ne connaît
--     pas `subscription_grant` (prolongation / offre manuelle d'un abonnement).
--  2. get_platform_shops() : le plan affiché est désormais le plan EFFECTIF (un
--     abonnement Pro échu ne s'affichait plus « Pro » à tort), avec la fin de période,
--     le pays, le type d'activité et la dernière commande, pour filtrer et relancer.
-- Idempotent, re-exécutable.

alter table public.admin_audit_log drop constraint if exists admin_audit_log_action_check;
alter table public.admin_audit_log
  add constraint admin_audit_log_action_check
  check (action in (
    'support_access', 'user_delete', 'team_add',
    'biztype_save', 'payment_approve', 'payment_reject', 'promo_save',
    'template_save', 'subscription_grant'
  ));

drop function if exists public.get_platform_shops();

create function public.get_platform_shops()
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
  owner_email text,
  country_code text,
  business_type text,
  subscribed_plan text,
  period_end timestamptz,
  last_order_at timestamptz
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
      case
        when sub.plan is not null and sub.plan <> 'free' and sub.current_period_end > now() then sub.plan
        else 'free'
      end as plan,
      coalesce(sub.status, 'none') as plan_status,
      s.owner_id,
      (select u.email::text from auth.users u where u.id = s.owner_id) as owner_email,
      s.country_code::text,
      s.business_type::text,
      coalesce(sub.plan, 'free') as subscribed_plan,
      sub.current_period_end as period_end,
      (select max(o.created_at) from public.orders o where o.shop_id = s.id) as last_order_at
    from public.shops s
    left join public.shop_subscriptions sub on sub.shop_id = s.id
    order by s.created_at desc;
end;
$$;

revoke all on function public.get_platform_shops() from public, anon;
grant execute on function public.get_platform_shops() to authenticated;
