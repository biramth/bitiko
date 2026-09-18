-- Publish version history: archives the outgoing published design (theme +
-- home + system template sections) each time a merchant overwrites it via
-- the store-wide "Publier" action, so a mistake can be rolled back instead
-- of being an unrecoverable loss. Scoped to that action only — custom pages
-- keep their own separate per-page publish lifecycle, untouched here.

create table public.shop_publish_history (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  theme_color text not null,
  theme_config jsonb not null,
  sections jsonb not null default '[]'::jsonb,
  templates jsonb not null default '{}'::jsonb,
  published_at timestamptz not null default now()
);

alter table public.shop_publish_history enable row level security;

create policy "Owner reads publish history"
  on public.shop_publish_history for select
  using (shop_id in (select id from public.shops where owner_id = auth.uid()));

create policy "Owner inserts publish history"
  on public.shop_publish_history for insert
  with check (shop_id in (select id from public.shops where owner_id = auth.uid()));

create index idx_shop_publish_history_shop_id on public.shop_publish_history(shop_id, published_at desc);

-- Rolling window, not an unbounded audit log — keep only the most recent
-- 20 entries per shop.
create or replace function public.prune_shop_publish_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.shop_publish_history
  where shop_id = new.shop_id
    and id not in (
      select id from public.shop_publish_history
      where shop_id = new.shop_id
      order by published_at desc
      limit 20
    );
  return new;
end;
$$;

create trigger trg_prune_shop_publish_history
  after insert on public.shop_publish_history
  for each row execute function public.prune_shop_publish_history();
