-- 0158 : toutes les notes de la boutique, au même endroit (lecture seule).
--
-- La page Notes regroupe, en plus du bloc-notes (0157), les notes laissées sur
-- les fiches : commandes (note interne), journal des finances, tontines
-- (tontine, membre, versement, remise, motif d'annulation), rendez-vous et
-- réservations. Chaque note se modifie sur sa fiche d'origine.
-- Réservé au propriétaire et aux managers (le vendeur ne voit ni les chiffres
-- ni les notes). Idempotent, re-exécutable.

create or replace function public.shop_notes_feed(p_shop_id uuid, p_limit integer default 500)
returns table (
  source text,
  target_id uuid,
  sub_id uuid,
  title text,
  person text,
  amount bigint,
  on_date date,
  note text,
  noted_at timestamptz
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
  select f.source, f.target_id, f.sub_id, f.title, f.person, f.amount, f.on_date, f.note, f.noted_at
  from (
    select 'order'::text as source, o.id as target_id, null::uuid as sub_id, o.order_number as title,
           o.customer_name as person, round(o.total)::bigint as amount, o.created_at::date as on_date,
           o.notes as note, o.updated_at as noted_at
    from public.orders o
    where o.shop_id = p_shop_id

    union all
    select 'finance', e.id, null, e.label, null, e.amount::bigint, e.entry_date, e.note, e.updated_at
    from public.finance_entries e
    where e.shop_id = p_shop_id

    union all
    select 'tontine', t.id, null, t.name, null, null, null, t.note, t.updated_at
    from public.tontines t
    where t.shop_id = p_shop_id

    union all
    select 'tontine_member', m.tontine_id, m.id, t.name, m.name, null, null, m.note, m.updated_at
    from public.tontine_members m
    join public.tontines t on t.id = m.tontine_id
    where m.shop_id = p_shop_id

    union all
    select 'tontine_settlement', m.tontine_id, m.id, t.name, m.name, m.settled_amount::bigint, m.settled_on,
           m.settlement_note, m.updated_at
    from public.tontine_members m
    join public.tontines t on t.id = m.tontine_id
    where m.shop_id = p_shop_id and m.status = 'settled'

    union all
    select 'tontine_contribution', c.tontine_id, c.member_id, t.name, m.name, c.amount::bigint, c.paid_on, c.note, c.created_at
    from public.tontine_contributions c
    join public.tontine_members m on m.id = c.member_id
    join public.tontines t on t.id = c.tontine_id
    where c.shop_id = p_shop_id

    union all
    select 'tontine_cancel', c.tontine_id, c.member_id, t.name, m.name, c.amount::bigint, c.paid_on, c.cancel_reason, c.cancelled_at
    from public.tontine_contributions c
    join public.tontine_members m on m.id = c.member_id
    join public.tontines t on t.id = c.tontine_id
    where c.shop_id = p_shop_id and c.cancelled_at is not null

    union all
    select 'appointment', a.id, null, coalesce(a.service_name, 'Rendez-vous'), a.customer_name, null, a.start_at::date, a.notes, a.created_at
    from public.appointments a
    where a.shop_id = p_shop_id

    union all
    select 'reservation', r.id, null, r.party_size || ' pers.', r.customer_name, null, r.start_at::date, r.notes, r.updated_at
    from public.reservations r
    where r.shop_id = p_shop_id
  ) f
  where f.note is not null and length(trim(f.note)) > 0
  order by f.noted_at desc
  limit greatest(least(coalesce(p_limit, 500), 1000), 1);
end;
$$;

revoke all on function public.shop_notes_feed(uuid, integer) from public, anon;
grant execute on function public.shop_notes_feed(uuid, integer) to authenticated;
