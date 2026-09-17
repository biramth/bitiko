-- ---------------------------------------------------------------------------
-- Campaign tool for the platform team (mainly the marketing role).
--
-- A campaign is authored in-app (name/subject/body + a saved audience
-- segment), previewed against the real audience, then sent once through
-- Resend. `platform_audience()` resolves a segment descriptor to the matching
-- shops server-side so the composer can show a live recipient count and the
-- send step uses the exact same logic.
--
-- Writes are service-role only (no RLS policies), like platform_members /
-- wave_payments — the Data API never exposes these tables directly.
-- ---------------------------------------------------------------------------

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  body text not null,
  audience jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'sent')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  recipient_count integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0
);

alter table public.campaigns enable row level security;

create table public.campaign_sends (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  shop_id uuid references public.shops(id) on delete set null,
  email text not null,
  status text not null check (status in ('sent', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

create index campaign_sends_campaign_idx on public.campaign_sends (campaign_id);

alter table public.campaign_sends enable row level security;

-- ---------------------------------------------------------------------------
-- Segment resolver. Audience descriptor keys (all optional, 'any' default):
--   vibe                 'any' | 'missing' | 'set'
--   plan                 'any' | 'free' | 'paid' | 'essential' | 'pro'
--   logo                 'any' | 'has' | 'none'
--   products             'any' | 'has' | 'none'
--   created_within_days  integer | null
-- ---------------------------------------------------------------------------
create or replace function public.platform_audience(audience jsonb default '{}'::jsonb)
returns table (
  shop_id uuid,
  owner_id uuid,
  shop_name text,
  slug text,
  currency text,
  plan text,
  vibe text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_vibe text := coalesce(audience->>'vibe', 'any');
  v_plan text := coalesce(audience->>'plan', 'any');
  v_logo text := coalesce(audience->>'logo', 'any');
  v_products text := coalesce(audience->>'products', 'any');
  v_days integer := nullif(audience->>'created_within_days', '')::integer;
begin
  if not public.is_platform_admin() then
    raise exception 'Accès réservé.';
  end if;

  return query
    select
      s.id, s.owner_id, s.name, s.slug, s.currency,
      coalesce(sub.plan, 'free') as plan,
      s.vibe
    from public.shops s
    left join public.shop_subscriptions sub on sub.shop_id = s.id
    where
      (v_vibe = 'any'
        or (v_vibe = 'missing' and s.vibe is null)
        or (v_vibe = 'set' and s.vibe is not null))
      and (v_plan = 'any'
        or (v_plan = 'paid' and coalesce(sub.plan, 'free') <> 'free' and coalesce(sub.status, 'none') = 'active')
        or (v_plan = 'free' and coalesce(sub.plan, 'free') = 'free')
        or (v_plan in ('essential', 'pro') and coalesce(sub.plan, 'free') = v_plan))
      and (v_logo = 'any'
        or (v_logo = 'has' and coalesce(s.logo_url, '') <> '')
        or (v_logo = 'none' and coalesce(s.logo_url, '') = ''))
      and (v_products = 'any'
        or (v_products = 'has' and exists (select 1 from public.products p where p.shop_id = s.id))
        or (v_products = 'none' and not exists (select 1 from public.products p where p.shop_id = s.id)))
      and (v_days is null or s.created_at >= now() - make_interval(days => v_days))
    order by s.created_at desc;
end;
$$;

revoke all on function public.platform_audience(jsonb) from public, anon;
grant execute on function public.platform_audience(jsonb) to authenticated;