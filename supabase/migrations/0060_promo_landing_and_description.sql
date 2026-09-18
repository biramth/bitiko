-- Promo campaigns can now be created by the platform team (Promotions tool) and
-- shown on the public landing page. `show_on_landing` opts a code into the
-- landing banner; `description` is the short pitch shown on the offer card.

alter table public.promo_codes
  add column show_on_landing boolean not null default false,
  add column description text check (description is null or length(description) <= 200);

update public.promo_codes set show_on_landing = true where code = 'bitiko1mois';

-- get_promo_offer now also returns the description (return type change => drop + create).
drop function if exists public.get_promo_offer(uuid);

create function public.get_promo_offer(p_shop_id uuid)
returns table(code text, label text, description text, plan text, days integer, expires_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.shops s where s.id = p_shop_id and s.owner_id = auth.uid()) then
    return;
  end if;

  return query
    select c.code, c.label, c.description, c.plan, c.days, c.expires_at
    from public.promo_codes c
    where c.active
      and c.starts_at <= now()
      and (c.expires_at is null or c.expires_at > now())
      and (c.max_redemptions is null
           or (select count(*) from public.promo_redemptions r where r.code = c.code) < c.max_redemptions)
      and not exists (select 1 from public.promo_redemptions r where r.code = c.code and r.shop_id = p_shop_id)
      and public.plan_rank(c.plan) >= public.plan_rank(public.effective_plan_key(p_shop_id))
    order by public.plan_rank(c.plan) desc, c.days desc
    limit 1;
end;
$$;

revoke execute on function public.get_promo_offer(uuid) from public, anon;
grant execute on function public.get_promo_offer(uuid) to authenticated;

-- What the public landing page may advertise (no auth): the best live campaign
-- flagged show_on_landing. Exposes only marketing fields, never counts.
create function public.get_landing_promo()
returns table(code text, label text, description text, plan text, days integer, expires_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select c.code, c.label, c.description, c.plan, c.days, c.expires_at
  from public.promo_codes c
  where c.active
    and c.show_on_landing
    and c.starts_at <= now()
    and (c.expires_at is null or c.expires_at > now())
    and (c.max_redemptions is null
         or (select count(*) from public.promo_redemptions r where r.code = c.code) < c.max_redemptions)
  order by public.plan_rank(c.plan) desc, c.days desc
  limit 1;
$$;

revoke execute on function public.get_landing_promo() from public;
grant execute on function public.get_landing_promo() to anon, authenticated;
