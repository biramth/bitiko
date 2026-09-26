-- 0133 : suspension d'une boutique + santé technique de la plateforme.
--
--  1. shops.suspended_at : l'équipe Bitiko peut suspendre une boutique (abus, litige, impayé grave).
--     Effet : la vitrine affiche « indisponible » et plus AUCUNE commande, rendez-vous ni réservation
--     ne peut être créé (trigger côté base : le frontend n'est jamais la seule barrière, et les RPC
--     SECURITY DEFINER insèrent dans les mêmes tables). Les données du commerçant restent intactes ;
--     lever la suspension rétablit tout. Le motif vit dans le journal d'audit (jamais lisible en public).
--  2. admin_audit_log : actions `shop_suspend` / `shop_unsuspend`.
--  3. get_platform_shops() : expose `suspended_at`.
--  4. get_platform_health() : ce qui est en panne ou en retard côté plateforme (événements non traités,
--     automatisations échouées, campagnes en échec, paiements à vérifier depuis trop longtemps).
-- Idempotent, re-exécutable.

alter table public.shops add column if not exists suspended_at timestamptz;

create or replace function public.block_suspended_shop_writes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.shops s where s.id = new.shop_id and s.suspended_at is not null) then
    raise exception 'shop_suspended' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function public.block_suspended_shop_writes() from public, anon, authenticated;

drop trigger if exists orders_block_suspended on public.orders;
create trigger orders_block_suspended
  before insert on public.orders
  for each row execute function public.block_suspended_shop_writes();

drop trigger if exists appointments_block_suspended on public.appointments;
create trigger appointments_block_suspended
  before insert on public.appointments
  for each row execute function public.block_suspended_shop_writes();

drop trigger if exists reservations_block_suspended on public.reservations;
create trigger reservations_block_suspended
  before insert on public.reservations
  for each row execute function public.block_suspended_shop_writes();

alter table public.admin_audit_log drop constraint if exists admin_audit_log_action_check;
alter table public.admin_audit_log
  add constraint admin_audit_log_action_check
  check (action in (
    'support_access', 'user_delete', 'team_add',
    'biztype_save', 'payment_approve', 'payment_reject', 'promo_save',
    'template_save', 'subscription_grant', 'shop_suspend', 'shop_unsuspend'
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
  last_order_at timestamptz,
  suspended_at timestamptz
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
      (select max(o.created_at) from public.orders o where o.shop_id = s.id) as last_order_at,
      s.suspended_at
    from public.shops s
    left join public.shop_subscriptions sub on sub.shop_id = s.id
    order by s.created_at desc;
end;
$$;

revoke all on function public.get_platform_shops() from public, anon;
grant execute on function public.get_platform_shops() to authenticated;

-- Santé technique : un seul appel, un jsonb prêt à afficher.
create or replace function public.get_platform_health()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Accès réservé.';
  end if;

  select jsonb_build_object(
    'generated_at', now(),
    'pending_events', (select count(*) from public.business_events where not processed),
    'stuck_events', (select count(*) from public.business_events where not processed and occurred_at < now() - interval '15 minutes'),
    'oldest_pending_event', (select min(occurred_at) from public.business_events where not processed),
    'failed_runs_7d', (select count(*) from public.automation_runs where status = 'failed' and created_at > now() - interval '7 days'),
    'skipped_runs_7d', (
      select coalesce(jsonb_object_agg(reason, n), '{}'::jsonb) from (
        select coalesce(detail->>'reason', 'autre') as reason, count(*) as n
        from public.automation_runs
        where status = 'skipped' and created_at > now() - interval '7 days'
        group by 1
      ) t
    ),
    'recent_failures', (
      select coalesce(jsonb_agg(f order by f.created_at desc), '[]'::jsonb) from (
        select r.created_at, ru.event_type, s.name as shop_name, left(coalesce(r.detail->>'error', ''), 200) as error
        from public.automation_runs r
        join public.automation_rules ru on ru.id = r.rule_id
        left join public.shops s on s.id = ru.shop_id
        where r.status = 'failed' and r.created_at > now() - interval '7 days'
        order by r.created_at desc
        limit 15
      ) f
    ),
    'campaign_failures', (
      select coalesce(jsonb_agg(c order by c.sent_at desc), '[]'::jsonb) from (
        select name, sent_at, failed_count, recipient_count
        from public.campaigns
        where failed_count > 0 and sent_at > now() - interval '30 days'
        order by sent_at desc
        limit 10
      ) c
    ),
    'stale_payments', (
      select count(*) from public.wave_payments
      where status = 'pending' and proof_submitted_at is not null and proof_submitted_at < now() - interval '24 hours'
    ),
    'suspended_shops', (select count(*) from public.shops where suspended_at is not null)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_platform_health() from public, anon;
grant execute on function public.get_platform_health() to authenticated;
