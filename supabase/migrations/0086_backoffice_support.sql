-- ---------------------------------------------------------------------------
-- Backoffice support : impersonation d'une boutique, suppression d'un compte
-- utilisateur, et invitations d'équipe sans compte préalable.
--
-- 1. get_platform_shops() renvoie aussi le propriétaire (id + email) pour
--    que l'espace équipe puisse offrir « accéder en support » et « supprimer
--    le compte » sans seconde requête.
-- 2. Les FKs `created_by` passent en ON DELETE SET NULL : la suppression
--    d'un membre plateforme (ou de n'importe quel utilisateur) qui a créé
--    des campagnes/membres ne doit plus échouer sur le NO ACTION — la
--    référence est libérée, la trace d'audit reste.
-- 3. admin_audit_log : trace service-role uniquement des actions sensibles
--    du backoffice (accès support, suppression de compte). Volontairement
--    SANS aucune foreign key — une ligne d'audit ne doit jamais bloquer la
--    suppression de l'utilisateur qu'elle décrit.
-- ---------------------------------------------------------------------------

drop function public.get_platform_shops();

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
      (select u.email from auth.users u where u.id = s.owner_id) as owner_email
    from public.shops s
    left join public.shop_subscriptions sub on sub.shop_id = s.id
    order by s.created_at desc;
end;
$$;

revoke all on function public.get_platform_shops() from public, anon;
grant execute on function public.get_platform_shops() to authenticated;

-- ---------------------------------------------------------------------------
-- FKs created_by → ON DELETE SET NULL
-- ---------------------------------------------------------------------------

alter table public.platform_members drop constraint if exists platform_members_created_by_fkey;
alter table public.platform_members
  add constraint platform_members_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.campaigns drop constraint if exists campaigns_created_by_fkey;
alter table public.campaigns
  add constraint campaigns_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Trace d'audit des actions sensibles du backoffice. Aucune FK volontairement
-- (voir en-tête) ; écriture exclusivement via la clé service role. RLS actif
-- et zéro policy : jamais lisible/écrite via la Data API.
-- ---------------------------------------------------------------------------

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  actor_email text not null,
  action text not null check (action in ('support_access', 'user_delete', 'team_add')),
  target_user_id uuid,
  target_shop_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
create index admin_audit_log_action_idx on public.admin_audit_log (action);

alter table public.admin_audit_log enable row level security;

revoke all on table public.admin_audit_log from public, anon, authenticated;