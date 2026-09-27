-- SEO des pages personnalisées : image de partage, exclusion d'indexation et
-- redirections automatiques quand le marchand renomme le slug d'une page
-- (les liens déjà partagés sur WhatsApp continuent de fonctionner).

alter table public.pages
  add column og_image text,
  add column noindex boolean not null default false;

create table public.page_redirects (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  from_slug text not null,
  to_slug text not null,
  created_at timestamptz not null default now(),
  unique (shop_id, from_slug)
);

create index idx_page_redirects_shop on public.page_redirects(shop_id);

alter table public.page_redirects enable row level security;

-- Les redirections servent la vitrine publique (résolution d'anciens liens).
create policy "Page redirects are public"
  on public.page_redirects for select using (true);

create policy "Owner manages page redirects"
  on public.page_redirects for all
  using (shop_id in (select id from public.shops where owner_id = auth.uid()))
  with check (shop_id in (select id from public.shops where owner_id = auth.uid()));

create policy "Manager manages page redirects"
  on public.page_redirects for all
  using (public.shop_role(shop_id) = 'manager')
  with check (public.shop_role(shop_id) = 'manager');

-- Mémorise l'ancien slug vers le nouveau à chaque renommage (conflit =
-- renommage en chaîne : la cible est mise à jour, jamais de doublon).
create or replace function public.record_page_slug_redirect()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.slug is distinct from new.slug then
    insert into public.page_redirects(shop_id, from_slug, to_slug)
    values (new.shop_id, old.slug, new.slug)
    on conflict (shop_id, from_slug) do update set to_slug = excluded.to_slug;
  end if;
  return new;
end;
$$;

revoke all on function public.record_page_slug_redirect() from public, anon;

drop trigger if exists trg_page_slug_redirect on public.pages;
create trigger trg_page_slug_redirect
  after update of slug on public.pages
  for each row execute function public.record_page_slug_redirect();
