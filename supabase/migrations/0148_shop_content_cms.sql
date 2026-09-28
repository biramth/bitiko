-- CMS Contenu : promos, avis, FAQ et publications sociales gérés depuis une
-- page dédiée (/admin/contenu), affichés au choix dans la vitrine via les
-- blocs builder (source manuelle = comportement historique, source CMS =
-- collection ci-dessous). Suit les conventions existantes :
--   - shop_id + cascade, sort_order, is_active, timestamps (0114),
--   - vitrine publique = lignes actives (comme products/services),
--   - écriture équipe via shops.owner_id / shop_role() (0093/0094/0114).
-- Les promos sont marketing (pastille + bandeau), jamais un changement de
-- prix : le prix reste calculé en base par create_order().

-- ── Tables ────────────────────────────────────────────────────────────────

create table if not exists public.shop_promos (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  body text null,
  button_label text null,
  button_link text null,
  image_url text null,
  badge_label text null check (badge_label is null or char_length(badge_label) <= 24),
  scope text not null default 'site' check (scope in ('site', 'product', 'category', 'service')),
  product_id uuid null references public.products(id) on delete cascade,
  category_id uuid null references public.categories(id) on delete cascade,
  service_id uuid null references public.services(id) on delete cascade,
  starts_at timestamptz null,
  ends_at timestamptz null check (ends_at is null or starts_at is null or ends_at > starts_at),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shop_promos_scope_target_check check (
    (scope = 'site' and product_id is null and category_id is null and service_id is null)
    or (scope = 'product' and product_id is not null and category_id is null and service_id is null)
    or (scope = 'category' and product_id is null and category_id is not null and service_id is null)
    or (scope = 'service' and product_id is null and category_id is null and service_id is not null)
  )
);

create index if not exists shop_promos_shop_idx on public.shop_promos (shop_id);
create index if not exists shop_promos_shop_active_idx on public.shop_promos (shop_id, is_active);
create index if not exists shop_promos_product_idx on public.shop_promos (product_id) where product_id is not null;
create index if not exists shop_promos_category_idx on public.shop_promos (category_id) where category_id is not null;
create index if not exists shop_promos_service_idx on public.shop_promos (service_id) where service_id is not null;

create table if not exists public.shop_testimonials (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  text text not null check (length(trim(text)) > 0),
  rating smallint null check (rating is null or (rating >= 1 and rating <= 5)),
  photo_url text null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_testimonials_shop_idx on public.shop_testimonials (shop_id);
create index if not exists shop_testimonials_shop_active_idx on public.shop_testimonials (shop_id, is_active);

create table if not exists public.shop_faqs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  question text not null check (length(trim(question)) > 0),
  answer text not null check (length(trim(answer)) > 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_faqs_shop_idx on public.shop_faqs (shop_id);
create index if not exists shop_faqs_shop_active_idx on public.shop_faqs (shop_id, is_active);

create table if not exists public.shop_social_posts (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  url text not null check (url like 'http%'),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_social_posts_shop_idx on public.shop_social_posts (shop_id);
create index if not exists shop_social_posts_shop_active_idx on public.shop_social_posts (shop_id, is_active);

drop trigger if exists shop_promos_set_updated_at on public.shop_promos;
create trigger shop_promos_set_updated_at
  before update on public.shop_promos
  for each row execute function public.set_updated_at();

drop trigger if exists shop_testimonials_set_updated_at on public.shop_testimonials;
create trigger shop_testimonials_set_updated_at
  before update on public.shop_testimonials
  for each row execute function public.set_updated_at();

drop trigger if exists shop_faqs_set_updated_at on public.shop_faqs;
create trigger shop_faqs_set_updated_at
  before update on public.shop_faqs
  for each row execute function public.set_updated_at();

drop trigger if exists shop_social_posts_set_updated_at on public.shop_social_posts;
create trigger shop_social_posts_set_updated_at
  before update on public.shop_social_posts
  for each row execute function public.set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────

alter table public.shop_promos enable row level security;
alter table public.shop_testimonials enable row level security;
alter table public.shop_faqs enable row level security;
alter table public.shop_social_posts enable row level security;

drop policy if exists "shop_promos: public read active" on public.shop_promos;
create policy "shop_promos: public read active" on public.shop_promos
  for select using (
    is_active = true
    or public.shop_role(shop_id) in ('owner', 'manager', 'vendeur')
  );

drop policy if exists "shop_promos: owner write" on public.shop_promos;
create policy "shop_promos: owner write" on public.shop_promos
  for all using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

drop policy if exists "shop_promos: manager write" on public.shop_promos;
create policy "shop_promos: manager write" on public.shop_promos
  for all using (public.shop_role(shop_id) = 'manager')
  with check (public.shop_role(shop_id) = 'manager');

drop policy if exists "shop_testimonials: public read active" on public.shop_testimonials;
create policy "shop_testimonials: public read active" on public.shop_testimonials
  for select using (
    is_active = true
    or public.shop_role(shop_id) in ('owner', 'manager', 'vendeur')
  );

drop policy if exists "shop_testimonials: owner write" on public.shop_testimonials;
create policy "shop_testimonials: owner write" on public.shop_testimonials
  for all using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

drop policy if exists "shop_testimonials: manager write" on public.shop_testimonials;
create policy "shop_testimonials: manager write" on public.shop_testimonials
  for all using (public.shop_role(shop_id) = 'manager')
  with check (public.shop_role(shop_id) = 'manager');

drop policy if exists "shop_faqs: public read active" on public.shop_faqs;
create policy "shop_faqs: public read active" on public.shop_faqs
  for select using (
    is_active = true
    or public.shop_role(shop_id) in ('owner', 'manager', 'vendeur')
  );

drop policy if exists "shop_faqs: owner write" on public.shop_faqs;
create policy "shop_faqs: owner write" on public.shop_faqs
  for all using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

drop policy if exists "shop_faqs: manager write" on public.shop_faqs;
create policy "shop_faqs: manager write" on public.shop_faqs
  for all using (public.shop_role(shop_id) = 'manager')
  with check (public.shop_role(shop_id) = 'manager');

drop policy if exists "shop_social_posts: public read active" on public.shop_social_posts;
create policy "shop_social_posts: public read active" on public.shop_social_posts
  for select using (
    is_active = true
    or public.shop_role(shop_id) in ('owner', 'manager', 'vendeur')
  );

drop policy if exists "shop_social_posts: owner write" on public.shop_social_posts;
create policy "shop_social_posts: owner write" on public.shop_social_posts
  for all using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

drop policy if exists "shop_social_posts: manager write" on public.shop_social_posts;
create policy "shop_social_posts: manager write" on public.shop_social_posts
  for all using (public.shop_role(shop_id) = 'manager')
  with check (public.shop_role(shop_id) = 'manager');

grant select on public.shop_promos to anon;
grant select on public.shop_testimonials to anon;
grant select on public.shop_faqs to anon;
grant select on public.shop_social_posts to anon;
grant select, insert, update, delete on public.shop_promos to authenticated;
grant select, insert, update, delete on public.shop_testimonials to authenticated;
grant select, insert, update, delete on public.shop_faqs to authenticated;
grant select, insert, update, delete on public.shop_social_posts to authenticated;
