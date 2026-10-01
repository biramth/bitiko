-- 0157 : bloc-notes du commerçant.
--
-- Rappels, idées, infos fournisseurs… : des notes libres partagées entre le
-- propriétaire et ses managers (jamais le vendeur, comme les chiffres : une
-- note peut contenir des prix d'achat ou des contacts fournisseurs).
-- Idempotent, re-exécutable.

create table if not exists public.shop_notes (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  title text null check (title is null or length(title) <= 120),
  body text not null default '' check (length(body) <= 10000),
  pinned boolean not null default false,
  color text not null default 'default' check (color in ('default', 'yellow', 'green', 'blue', 'pink')),
  created_by uuid null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shop_notes_not_empty check (length(trim(coalesce(title, ''))) > 0 or length(trim(body)) > 0)
);

create index if not exists shop_notes_shop_idx on public.shop_notes (shop_id, pinned desc, updated_at desc);

drop trigger if exists shop_notes_set_updated_at on public.shop_notes;
create trigger shop_notes_set_updated_at
  before update on public.shop_notes
  for each row execute function public.set_updated_at();

alter table public.shop_notes enable row level security;

drop policy if exists "shop_notes: owner manager all" on public.shop_notes;
create policy "shop_notes: owner manager all" on public.shop_notes
  for all using (public.shop_role(shop_id) in ('owner', 'manager'))
  with check (public.shop_role(shop_id) in ('owner', 'manager'));

revoke all on public.shop_notes from anon, authenticated;
grant select, insert, update, delete on public.shop_notes to authenticated;
