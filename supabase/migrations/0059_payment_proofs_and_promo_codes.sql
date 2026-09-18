-- (1) Proof of payment. "J'ai payé" used to be a bare button: anyone could
-- claim a payment. The merchant now uploads a screenshot of the Wave receipt
-- (+ optionally the transaction reference and the number that paid); the
-- platform team checks it against Wave, then approves or rejects with a reason.
--
-- (2) Promo codes: time-limited free months of a paid plan ("1 mois Essentiel
-- offert"), redeemable once per shop, applied through an RPC that writes the
-- subscription server-side. When the period ends the shop reverts to free on
-- its own (effective_plan_key / effectivePlanKey already do this).

alter table public.wave_payments
  add column proof_path text,
  add column payer_phone text,
  add column transaction_ref text,
  add column rejection_reason text,
  add column proof_submitted_at timestamptz;

-- The same Wave transaction can't back two claims (pending or accepted).
create unique index wave_payments_transaction_ref_uniq
  on public.wave_payments (lower(transaction_ref))
  where transaction_ref is not null and status in ('pending', 'succeeded');

-- Private bucket: only the shop owner can upload into "<shop_id>/", nobody can
-- read through the API — the platform team gets short-lived signed URLs from a
-- server function (service role).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "payment-proofs: owner insert" on storage.objects
  for insert with check (
    bucket_id = 'payment-proofs'
    and exists (
      select 1 from public.shops s
      where s.id::text = (storage.foldername(storage.objects.name))[1]
        and s.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------- promo codes

create table public.promo_codes (
  code text primary key check (code = lower(code) and length(code) between 3 and 40),
  label text not null,
  plan text not null check (plan in ('essential', 'pro')),
  days integer not null check (days between 1 and 366),
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  code text not null references public.promo_codes(code),
  shop_id uuid not null references public.shops(id) on delete cascade,
  period_end timestamptz not null,
  redeemed_at timestamptz not null default now(),
  unique (code, shop_id)
);

-- No policies on purpose: these tables are only reached through the RPCs below.
alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;

create or replace function public.plan_rank(p_plan text)
returns integer
language sql
immutable
set search_path = public
as $$
  select case p_plan when 'pro' then 2 when 'essential' then 1 else 0 end;
$$;

-- The offer this shop can claim right now (at most one row): an active,
-- in-window, not-exhausted code the shop hasn't used yet, that doesn't
-- downgrade the plan the shop already has. Owner-only.
create or replace function public.get_promo_offer(p_shop_id uuid)
returns table(code text, label text, plan text, days integer, expires_at timestamptz)
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
    select c.code, c.label, c.plan, c.days, c.expires_at
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

-- Claims a promo (p_code null = the shop's current offer). Returns the new end
-- of the subscription. Same plan already active => the days are added on top.
create or replace function public.redeem_promo_code(p_shop_id uuid, p_code text default null)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := nullif(lower(trim(coalesce(p_code, ''))), '');
  v_promo record;
  v_current text;
  v_sub record;
  v_end timestamptz;
begin
  if not exists (select 1 from public.shops s where s.id = p_shop_id and s.owner_id = auth.uid()) then
    raise exception 'Cette boutique ne vous appartient pas.';
  end if;

  if v_code is null then
    select o.code into v_code from public.get_promo_offer(p_shop_id) o;
    if v_code is null then
      raise exception 'Aucune offre disponible pour votre boutique.';
    end if;
  end if;

  -- Lock the code row so max_redemptions can't be overshot by concurrent claims.
  select * into v_promo from public.promo_codes where code = v_code for update;
  if not found or not v_promo.active or v_promo.starts_at > now()
     or (v_promo.expires_at is not null and v_promo.expires_at <= now()) then
    raise exception 'Code invalide ou expiré.';
  end if;

  if exists (select 1 from public.promo_redemptions r where r.code = v_code and r.shop_id = p_shop_id) then
    raise exception 'Vous avez déjà utilisé cette offre.';
  end if;

  if v_promo.max_redemptions is not null
     and (select count(*) from public.promo_redemptions r where r.code = v_code) >= v_promo.max_redemptions then
    raise exception 'Cette offre est épuisée.';
  end if;

  v_current := public.effective_plan_key(p_shop_id);
  if public.plan_rank(v_current) > public.plan_rank(v_promo.plan) then
    raise exception 'Votre boutique a déjà un plan supérieur à cette offre.';
  end if;

  select * into v_sub from public.shop_subscriptions where shop_id = p_shop_id;
  if v_current = v_promo.plan and v_sub.current_period_end is not null and v_sub.current_period_end > now() then
    v_end := v_sub.current_period_end + make_interval(days => v_promo.days);
  else
    v_end := now() + make_interval(days => v_promo.days);
  end if;

  insert into public.shop_subscriptions (shop_id, plan, status, current_period_end)
  values (p_shop_id, v_promo.plan, 'active', v_end)
  on conflict (shop_id) do update
    set plan = excluded.plan, status = 'active', current_period_end = excluded.current_period_end, updated_at = now();

  insert into public.promo_redemptions (code, shop_id, period_end) values (v_code, p_shop_id, v_end);

  return v_end;
end;
$$;

revoke execute on function public.get_promo_offer(uuid) from public, anon;
revoke execute on function public.redeem_promo_code(uuid, text) from public, anon;
grant execute on function public.get_promo_offer(uuid) to authenticated;
grant execute on function public.redeem_promo_code(uuid, text) to authenticated;
revoke execute on function public.plan_rank(text) from public, anon, authenticated;

-- The launch campaign: one free month of Essentiel for every shop, until
-- 2026-10-31. To end it earlier: update public.promo_codes set active = false
-- where code = 'bitiko1mois'.
insert into public.promo_codes (code, label, plan, days, expires_at)
values ('bitiko1mois', '1 mois Essentiel offert', 'essential', 30, '2026-10-31 23:59:59+00');
