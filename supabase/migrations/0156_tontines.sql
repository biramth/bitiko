-- 0156 : tontine commerciale — registre tenu à la main par le commerçant.
--
-- Des clients épargnent auprès de la boutique (Tabaski, rentrée, fêtes…) par
-- versements réguliers ; à la date de remise, chacun reçoit de la marchandise
-- (ou est remboursé) à hauteur de ce qu'il a épargné.
-- Bitiko ne fait transiter AUCUN argent : c'est un registre.
--   * `tontines` : une campagne (versement conseillé, rythme, dates) ;
--   * `tontine_members` : un client, son objectif, puis sa remise ;
--   * `tontine_contributions` : les versements, jamais modifiés ni supprimés —
--     une erreur s'annule avec un motif (trace en cas de litige).
-- L'épargne n'est PAS une recette (elle appartient aux clients) : seule une
-- remise en marchandise peut être reportée dans `finance_entries`.
-- Réservé au propriétaire et aux managers. Plafonds de plan appliqués côté base.
-- Idempotent, re-exécutable.

-- ── Tables ────────────────────────────────────────────────────────────────

create table if not exists public.tontines (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  goal_label text null check (goal_label is null or length(goal_label) <= 120),
  installment_amount integer not null check (installment_amount > 0 and installment_amount <= 100000000),
  frequency text not null default 'weekly' check (frequency in ('daily', 'weekly', 'monthly')),
  start_date date not null default current_date,
  end_date date not null,
  status text not null default 'active' check (status in ('active', 'closed')),
  note text null check (note is null or length(note) <= 500),
  created_by uuid null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tontines_dates_check check (end_date >= start_date and end_date - start_date <= 1100)
);

create index if not exists tontines_shop_idx on public.tontines (shop_id, status, end_date);

create table if not exists public.tontine_members (
  id uuid primary key default gen_random_uuid(),
  tontine_id uuid not null references public.tontines(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  -- Format canonique du pays de la boutique (normalisé par trigger).
  phone text null,
  target_amount integer not null check (target_amount > 0 and target_amount <= 1000000000),
  target_label text null check (target_label is null or length(target_label) <= 120),
  -- Versement propre au membre ; null = celui de la tontine.
  installment_amount integer null check (installment_amount is null or (installment_amount > 0 and installment_amount <= 100000000)),
  note text null check (note is null or length(note) <= 500),
  joined_on date not null default current_date,
  status text not null default 'active' check (status in ('active', 'settled')),
  settlement_kind text null check (settlement_kind is null or settlement_kind in ('goods', 'cash')),
  settled_amount integer null check (settled_amount is null or settled_amount >= 0),
  settled_on date null,
  settlement_note text null check (settlement_note is null or length(settlement_note) <= 500),
  finance_entry_id uuid null references public.finance_entries(id) on delete set null,
  created_by uuid null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tontine_members_settlement_check check (
    (status = 'settled') = (settlement_kind is not null and settled_amount is not null and settled_on is not null)
  )
);

create index if not exists tontine_members_tontine_idx on public.tontine_members (tontine_id, name);
create index if not exists tontine_members_shop_idx on public.tontine_members (shop_id);

-- Pas de cascade depuis la tontine ni le membre : un versement enregistré
-- empêche leur suppression (il faut clôturer). La suppression de la boutique,
-- elle, emporte tout.
create table if not exists public.tontine_contributions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  tontine_id uuid not null references public.tontines(id),
  member_id uuid not null references public.tontine_members(id),
  amount integer not null check (amount > 0 and amount <= 100000000),
  paid_on date not null default current_date,
  payment_method text null check (payment_method is null or payment_method in ('cash', 'mobile_money', 'bank', 'other')),
  note text null check (note is null or length(note) <= 500),
  created_by uuid null default auth.uid(),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz null,
  cancelled_by uuid null,
  cancel_reason text null check (cancel_reason is null or length(trim(cancel_reason)) between 1 and 200),
  constraint tontine_contributions_cancel_check check ((cancelled_at is null) = (cancel_reason is null))
);

create index if not exists tontine_contributions_member_idx on public.tontine_contributions (member_id, paid_on desc);
create index if not exists tontine_contributions_tontine_idx on public.tontine_contributions (tontine_id, created_at desc);
create index if not exists tontine_contributions_shop_idx on public.tontine_contributions (shop_id);

drop trigger if exists tontines_set_updated_at on public.tontines;
create trigger tontines_set_updated_at
  before update on public.tontines
  for each row execute function public.set_updated_at();

drop trigger if exists tontine_members_set_updated_at on public.tontine_members;
create trigger tontine_members_set_updated_at
  before update on public.tontine_members
  for each row execute function public.set_updated_at();

-- ── Plafonds de plan (PROPOSITION à valider) ──────────────────────────────

insert into public.plan_limits (plan_key, code, max_value) values
  ('free', 'MAX_ACTIVE_TONTINES', 1),
  ('essential', 'MAX_ACTIVE_TONTINES', 3),
  ('pro', 'MAX_ACTIVE_TONTINES', null),
  ('free', 'MAX_TONTINE_MEMBERS', 20),
  ('essential', 'MAX_TONTINE_MEMBERS', 100),
  ('pro', 'MAX_TONTINE_MEMBERS', null)
on conflict do nothing;

-- ── Règles d'écriture ─────────────────────────────────────────────────────

-- Tontines : plafond de campagnes actives ; pas de clôture tant qu'un membre
-- non remis a encore de l'épargne en caisse.
create or replace function public.tontines_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max integer;
  v_count integer;
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status <> 'active') then
    v_max := public.plan_limit(public.effective_plan_key(new.shop_id), 'MAX_ACTIVE_TONTINES');
    if v_max is not null then
      select count(*) into v_count from public.tontines where shop_id = new.shop_id and status = 'active' and id <> new.id;
      if v_count >= v_max then
        raise exception 'plan_limit_exceeded: le plan actuel autorise au maximum % tontine(s) en cours', v_max
          using errcode = '23514';
      end if;
    end if;
  end if;

  if tg_op = 'UPDATE' then
    new.shop_id := old.shop_id;
    if new.status = 'closed' and old.status <> 'closed' and exists (
      select 1
      from public.tontine_members m
      join public.tontine_contributions c on c.member_id = m.id and c.cancelled_at is null
      where m.tontine_id = new.id and m.status = 'active'
    ) then
      raise exception 'tontine_has_unsettled_savings: des membres ont encore de l''épargne à remettre'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.tontines_before_write() from public, anon, authenticated;

drop trigger if exists tontines_before_write on public.tontines;
create trigger tontines_before_write
  before insert or update on public.tontines
  for each row execute function public.tontines_before_write();

-- Membres : boutique déduite de la tontine, téléphone normalisé, plafond par
-- tontine. La remise ne passe que par settle/reopen (droits par colonne).
create or replace function public.tontine_members_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tontine record;
  v_max integer;
  v_count integer;
begin
  if tg_op = 'INSERT' then
    select t.shop_id, t.status into v_tontine from public.tontines t where t.id = new.tontine_id;
    if v_tontine.shop_id is null then
      raise exception 'tontine not found' using errcode = '23503';
    end if;
    if v_tontine.status <> 'active' then
      raise exception 'tontine_closed: cette tontine est clôturée' using errcode = '23514';
    end if;
    new.shop_id := v_tontine.shop_id;
    new.status := 'active';
    new.settlement_kind := null;
    new.settled_amount := null;
    new.settled_on := null;
    new.settlement_note := null;
    new.finance_entry_id := null;

    v_max := public.plan_limit(public.effective_plan_key(new.shop_id), 'MAX_TONTINE_MEMBERS');
    if v_max is not null then
      select count(*) into v_count from public.tontine_members where tontine_id = new.tontine_id;
      if v_count >= v_max then
        raise exception 'plan_limit_exceeded: le plan actuel autorise au maximum % membres par tontine', v_max
          using errcode = '23514';
      end if;
    end if;
  else
    new.tontine_id := old.tontine_id;
    new.shop_id := old.shop_id;
  end if;

  if tg_op = 'INSERT' or new.phone is distinct from old.phone then
    new.phone := public.normalize_phone(
      nullif(trim(new.phone), ''),
      (select s.country_code from public.shops s where s.id = new.shop_id)
    );
  end if;
  return new;
end;
$$;

revoke all on function public.tontine_members_before_write() from public, anon, authenticated;

drop trigger if exists tontine_members_before_write on public.tontine_members;
create trigger tontine_members_before_write
  before insert or update on public.tontine_members
  for each row execute function public.tontine_members_before_write();

-- Versements : boutique et tontine déduites du membre (la RLS refuse ensuite
-- toute boutique étrangère) ; refusés pour un membre remis ou une tontine close.
-- Le verrou partagé sérialise avec la remise et la clôture.
create or replace function public.tontine_contributions_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member record;
begin
  select m.shop_id, m.tontine_id, m.status as member_status, t.status as tontine_status
    into v_member
    from public.tontine_members m
    join public.tontines t on t.id = m.tontine_id
    where m.id = new.member_id
    for share of m, t;
  if v_member.shop_id is null then
    raise exception 'member not found' using errcode = '23503';
  end if;
  if v_member.tontine_status <> 'active' then
    raise exception 'tontine_closed: cette tontine est clôturée' using errcode = '23514';
  end if;
  if v_member.member_status <> 'active' then
    raise exception 'member_settled: ce membre a déjà reçu sa remise' using errcode = '23514';
  end if;
  new.shop_id := v_member.shop_id;
  new.tontine_id := v_member.tontine_id;
  new.created_by := auth.uid();
  new.created_at := now();
  new.cancelled_at := null;
  new.cancelled_by := null;
  new.cancel_reason := null;
  return new;
end;
$$;

revoke all on function public.tontine_contributions_before_insert() from public, anon, authenticated;

drop trigger if exists tontine_contributions_before_insert on public.tontine_contributions;
create trigger tontine_contributions_before_insert
  before insert on public.tontine_contributions
  for each row execute function public.tontine_contributions_before_insert();

-- ── RLS et droits ─────────────────────────────────────────────────────────

alter table public.tontines enable row level security;
alter table public.tontine_members enable row level security;
alter table public.tontine_contributions enable row level security;

drop policy if exists "tontines: owner manager all" on public.tontines;
create policy "tontines: owner manager all" on public.tontines
  for all using (public.shop_role(shop_id) in ('owner', 'manager'))
  with check (public.shop_role(shop_id) in ('owner', 'manager'));

drop policy if exists "tontine_members: owner manager all" on public.tontine_members;
create policy "tontine_members: owner manager all" on public.tontine_members
  for all using (public.shop_role(shop_id) in ('owner', 'manager'))
  with check (public.shop_role(shop_id) in ('owner', 'manager'));

drop policy if exists "tontine_contributions: owner manager read" on public.tontine_contributions;
create policy "tontine_contributions: owner manager read" on public.tontine_contributions
  for select using (public.shop_role(shop_id) in ('owner', 'manager'));

drop policy if exists "tontine_contributions: owner manager insert" on public.tontine_contributions;
create policy "tontine_contributions: owner manager insert" on public.tontine_contributions
  for insert with check (public.shop_role(shop_id) in ('owner', 'manager'));

-- Supabase accorde tout par défaut sur les nouvelles tables : on repart de zéro.
revoke all on public.tontines, public.tontine_members, public.tontine_contributions from anon, authenticated;
grant select, insert, delete on public.tontines to authenticated;
grant update (name, goal_label, installment_amount, frequency, start_date, end_date, status, note) on public.tontines to authenticated;
grant select, insert, delete on public.tontine_members to authenticated;
grant update (name, phone, target_amount, target_label, installment_amount, note, joined_on) on public.tontine_members to authenticated;
grant select, insert on public.tontine_contributions to authenticated;

-- ── Fonctions ─────────────────────────────────────────────────────────────

-- Annule un versement saisi par erreur (jamais de suppression).
create or replace function public.cancel_tontine_contribution(p_contribution_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  select c.shop_id, c.cancelled_at, m.status as member_status
    into v_row
    from public.tontine_contributions c
    join public.tontine_members m on m.id = c.member_id
    where c.id = p_contribution_id
    for update of c, m;
  if v_row.shop_id is null or not coalesce(public.shop_role(v_row.shop_id) in ('owner', 'manager'), false) then
    raise exception 'not authorized';
  end if;
  if v_row.cancelled_at is not null then
    raise exception 'already_cancelled: ce versement est déjà annulé' using errcode = '23514';
  end if;
  if v_row.member_status <> 'active' then
    raise exception 'member_settled: rouvrez d''abord la remise de ce membre' using errcode = '23514';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'reason_required: indiquez le motif de l''annulation' using errcode = '23514';
  end if;

  update public.tontine_contributions
    set cancelled_at = now(), cancelled_by = auth.uid(), cancel_reason = left(trim(p_reason), 200)
    where id = p_contribution_id;
end;
$$;

revoke all on function public.cancel_tontine_contribution(uuid, text) from public, anon;
grant execute on function public.cancel_tontine_contribution(uuid, text) to authenticated;

-- Remise : en marchandise (`goods`) ou en argent (`cash`, désistement ou
-- remboursement). Le montant remis est l'épargne du membre, calculée ici.
-- Une remise en marchandise peut être reportée en recette dans les Finances
-- (plafond de saisies du plan appliqué : tout est annulé s'il est atteint).
create or replace function public.settle_tontine_member(
  p_member_id uuid,
  p_kind text,
  p_settled_on date,
  p_note text default null,
  p_record_income boolean default false
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member record;
  v_saved integer;
  v_entry_id uuid;
begin
  select m.shop_id, m.status, m.name, t.name as tontine_name
    into v_member
    from public.tontine_members m
    join public.tontines t on t.id = m.tontine_id
    where m.id = p_member_id
    for update of m;
  if v_member.shop_id is null or not coalesce(public.shop_role(v_member.shop_id) in ('owner', 'manager'), false) then
    raise exception 'not authorized';
  end if;
  if v_member.status <> 'active' then
    raise exception 'member_settled: ce membre a déjà reçu sa remise' using errcode = '23514';
  end if;
  if p_kind is null or p_kind not in ('goods', 'cash') then
    raise exception 'invalid settlement kind';
  end if;
  if p_settled_on is null then
    raise exception 'invalid settlement date';
  end if;

  select coalesce(sum(amount), 0)::integer into v_saved
    from public.tontine_contributions
    where member_id = p_member_id and cancelled_at is null;

  if p_record_income and p_kind = 'goods' and v_saved > 0 then
    insert into public.finance_entries (shop_id, kind, category, label, amount, entry_date, note, created_by)
    values (
      v_member.shop_id, 'income', 'tontine',
      left('Remise tontine — ' || v_member.name, 120),
      v_saved, p_settled_on, left(v_member.tontine_name, 500), auth.uid()
    )
    returning id into v_entry_id;
  end if;

  update public.tontine_members
    set status = 'settled',
        settlement_kind = p_kind,
        settled_amount = v_saved,
        settled_on = p_settled_on,
        settlement_note = nullif(left(trim(coalesce(p_note, '')), 500), ''),
        finance_entry_id = v_entry_id
    where id = p_member_id;

  return v_saved;
end;
$$;

revoke all on function public.settle_tontine_member(uuid, text, date, text, boolean) from public, anon;
grant execute on function public.settle_tontine_member(uuid, text, date, text, boolean) to authenticated;

-- Annule une remise enregistrée par erreur (la recette éventuelle est retirée).
create or replace function public.reopen_tontine_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member record;
begin
  select m.shop_id, m.status, m.finance_entry_id, t.status as tontine_status
    into v_member
    from public.tontine_members m
    join public.tontines t on t.id = m.tontine_id
    where m.id = p_member_id
    for update of m;
  if v_member.shop_id is null or not coalesce(public.shop_role(v_member.shop_id) in ('owner', 'manager'), false) then
    raise exception 'not authorized';
  end if;
  if v_member.status <> 'settled' then
    raise exception 'member_not_settled: ce membre n''a pas encore reçu sa remise' using errcode = '23514';
  end if;
  if v_member.tontine_status <> 'active' then
    raise exception 'tontine_closed: cette tontine est clôturée' using errcode = '23514';
  end if;

  update public.tontine_members
    set status = 'active', settlement_kind = null, settled_amount = null, settled_on = null,
        settlement_note = null, finance_entry_id = null
    where id = p_member_id;

  if v_member.finance_entry_id is not null then
    delete from public.finance_entries where id = v_member.finance_entry_id;
  end if;
end;
$$;

revoke all on function public.reopen_tontine_member(uuid) from public, anon;
grant execute on function public.reopen_tontine_member(uuid) to authenticated;

-- Totaux par tontine pour la liste (évite de charger tous les versements).
create or replace function public.tontine_summaries(p_shop_id uuid)
returns table (
  tontine_id uuid,
  members_count integer,
  settled_members integer,
  collected bigint,
  paid_out bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not coalesce(public.shop_role(p_shop_id) in ('owner', 'manager'), false) then
    raise exception 'not authorized';
  end if;

  return query
  select t.id,
         (select count(*)::integer from public.tontine_members m where m.tontine_id = t.id),
         (select count(*)::integer from public.tontine_members m where m.tontine_id = t.id and m.status = 'settled'),
         (select coalesce(sum(c.amount), 0)::bigint from public.tontine_contributions c where c.tontine_id = t.id and c.cancelled_at is null),
         (select coalesce(sum(m.settled_amount), 0)::bigint from public.tontine_members m where m.tontine_id = t.id and m.status = 'settled')
  from public.tontines t
  where t.shop_id = p_shop_id;
end;
$$;

revoke all on function public.tontine_summaries(uuid) from public, anon;
grant execute on function public.tontine_summaries(uuid) to authenticated;

-- Épargne de chaque membre d'une tontine.
create or replace function public.tontine_member_balances(p_tontine_id uuid)
returns table (member_id uuid, saved bigint, contributions_count integer, last_paid_on date)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_shop_id uuid;
begin
  select t.shop_id into v_shop_id from public.tontines t where t.id = p_tontine_id;
  if v_shop_id is null or not coalesce(public.shop_role(v_shop_id) in ('owner', 'manager'), false) then
    raise exception 'not authorized';
  end if;

  return query
  select m.id,
         coalesce(sum(c.amount), 0)::bigint,
         count(c.id)::integer,
         max(c.paid_on)
  from public.tontine_members m
  left join public.tontine_contributions c on c.member_id = m.id and c.cancelled_at is null
  where m.tontine_id = p_tontine_id
  group by m.id;
end;
$$;

revoke all on function public.tontine_member_balances(uuid) from public, anon;
grant execute on function public.tontine_member_balances(uuid) to authenticated;
