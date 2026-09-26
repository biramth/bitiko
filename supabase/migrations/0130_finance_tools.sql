-- 0130 : outils de gestion — journal des dépenses / recettes et bilan simple.
--
-- Le commerçant suit ses finances sans logiciel comptable :
--   * `finance_entries` : dépenses et recettes saisies à la main (loyer, achats,
--     salaires, vente au comptoir…), par catégorie ;
--   * RPC `finance_revenue_by_month` : recettes calculées AUTOMATIQUEMENT à
--     partir des commandes payées ou livrées et des rendez-vous terminés (prix
--     figé au moment de la prise, 0122) ;
--   * RPC `finance_top_items` : produits et prestations qui rapportent le plus.
-- Réservé au propriétaire et aux managers (jamais le vendeur). Le plafond de
-- saisies mensuel du plan gratuit (MAX_MONTHLY_FINANCE_ENTRIES) est appliqué
-- côté base, comme les autres limites de plan.
-- Idempotent, re-exécutable.

create table if not exists public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  kind text not null check (kind in ('income', 'expense')),
  -- Code stable de catégorie (liste côté application) : « stock », « loyer »…
  category text not null check (category ~ '^[a-z_]{2,30}$'),
  label text not null check (length(trim(label)) between 1 and 120),
  amount integer not null check (amount > 0 and amount <= 1000000000),
  entry_date date not null default current_date,
  payment_method text null check (payment_method is null or payment_method in ('cash', 'mobile_money', 'bank', 'other')),
  note text null check (note is null or length(note) <= 500),
  created_by uuid null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_entries_shop_date_idx on public.finance_entries (shop_id, entry_date desc);

drop trigger if exists finance_entries_set_updated_at on public.finance_entries;
create trigger finance_entries_set_updated_at
  before update on public.finance_entries
  for each row execute function public.set_updated_at();

alter table public.finance_entries enable row level security;

drop policy if exists "finance_entries: staff manage" on public.finance_entries;
drop policy if exists "finance_entries: owner manager all" on public.finance_entries;
create policy "finance_entries: owner manager all" on public.finance_entries
  for all using (public.shop_role(shop_id) in ('owner', 'manager'))
  with check (public.shop_role(shop_id) in ('owner', 'manager'));

grant select, insert, update, delete on public.finance_entries to authenticated;

-- ── Plafond du plan gratuit ───────────────────────────────────────────────

insert into public.plan_limits (plan_key, code, max_value) values
  ('free', 'MAX_MONTHLY_FINANCE_ENTRIES', 30),
  ('essential', 'MAX_MONTHLY_FINANCE_ENTRIES', null),
  ('pro', 'MAX_MONTHLY_FINANCE_ENTRIES', null)
on conflict do nothing;

create or replace function public.enforce_finance_entry_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max integer;
  v_count integer;
begin
  v_max := public.plan_limit(public.effective_plan_key(new.shop_id), 'MAX_MONTHLY_FINANCE_ENTRIES');
  if v_max is null then
    return new;
  end if;
  select count(*) into v_count
  from public.finance_entries
  where shop_id = new.shop_id and created_at >= date_trunc('month', now());
  if v_count >= v_max then
    raise exception 'plan_limit_exceeded: le plan actuel autorise au maximum % saisies par mois', v_max
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_finance_entry_limit() from public, anon, authenticated;

drop trigger if exists finance_entries_enforce_plan_limit on public.finance_entries;
create trigger finance_entries_enforce_plan_limit
  before insert on public.finance_entries
  for each row execute function public.enforce_finance_entry_limit();

-- ── Recettes automatiques par mois ────────────────────────────────────────
-- Commandes payées OU livrées (les annulées et celles en attente ne comptent
-- pas), à la date de la commande ; rendez-vous terminés au prix figé à la prise.

create or replace function public.finance_revenue_by_month(p_shop_id uuid, p_from date, p_to date)
returns table (month date, source text, amount bigint, entries integer)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz text;
begin
  if not coalesce(public.shop_role(p_shop_id) in ('owner', 'manager'), false) then
    raise exception 'not authorized';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 800 then
    raise exception 'invalid period';
  end if;
  v_tz := (public.effective_booking_settings(p_shop_id)).timezone;

  return query
  select date_trunc('month', o.created_at at time zone v_tz)::date, 'orders'::text,
         round(sum(o.total))::bigint, count(*)::integer
  from public.orders o
  where o.shop_id = p_shop_id
    and o.status in ('paid', 'delivered')
    and (o.created_at at time zone v_tz)::date between p_from and p_to
  group by 1;

  return query
  select date_trunc('month', a.start_at at time zone v_tz)::date, 'appointments'::text,
         sum(coalesce(a.service_price, s.price, 0))::bigint, count(*)::integer
  from public.appointments a
  left join public.services s on s.id = a.service_id
  where a.shop_id = p_shop_id
    and a.status = 'done'
    and (a.start_at at time zone v_tz)::date between p_from and p_to
  group by 1;
end;
$$;

revoke all on function public.finance_revenue_by_month(uuid, date, date) from public, anon;
grant execute on function public.finance_revenue_by_month(uuid, date, date) to authenticated;

-- ── Ce qui rapporte le plus ───────────────────────────────────────────────

create or replace function public.finance_top_items(p_shop_id uuid, p_from date, p_to date, p_limit integer default 5)
returns table (name text, kind text, quantity bigint, amount bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz text;
begin
  if not coalesce(public.shop_role(p_shop_id) in ('owner', 'manager'), false) then
    raise exception 'not authorized';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 800 then
    raise exception 'invalid period';
  end if;
  v_tz := (public.effective_booking_settings(p_shop_id)).timezone;

  return query
  select t.name, t.kind, t.quantity, t.amount
  from (
    select i.product_name as name, 'product'::text as kind,
           sum(i.quantity)::bigint as quantity, round(sum(i.subtotal))::bigint as amount
    from public.order_items i
    join public.orders o on o.id = i.order_id
    where o.shop_id = p_shop_id
      and o.status in ('paid', 'delivered')
      and (o.created_at at time zone v_tz)::date between p_from and p_to
    group by i.product_name
    union all
    select coalesce(a.service_name, s.name, 'Prestation'), 'service'::text,
           count(*)::bigint, sum(coalesce(a.service_price, s.price, 0))::bigint
    from public.appointments a
    left join public.services s on s.id = a.service_id
    where a.shop_id = p_shop_id
      and a.status = 'done'
      and (a.start_at at time zone v_tz)::date between p_from and p_to
    group by coalesce(a.service_name, s.name, 'Prestation')
  ) t
  order by t.amount desc
  limit greatest(least(coalesce(p_limit, 5), 20), 1);
end;
$$;

revoke all on function public.finance_top_items(uuid, date, date, integer) from public, anon;
grant execute on function public.finance_top_items(uuid, date, date, integer) to authenticated;
