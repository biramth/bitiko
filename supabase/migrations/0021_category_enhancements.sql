-- Category enhancements: stable manual ordering, optional emoji and optional
-- description (admin-side / future SEO and storefront tiles).
alter table public.categories
  add column position integer not null default 0,
  add column emoji text,
  add column description text;

-- Give existing categories a stable starting order (alphabetical per shop),
-- so the new position column does not start everyone at 0.
with ranked as (
  select id, row_number() over (partition by shop_id order by name, created_at) - 1 as rn
  from public.categories
)
update public.categories c
set position = ranked.rn
from ranked
where c.id = ranked.id;

-- Positioned ordering is the hot path for both admin and storefront lists.
create index categories_shop_position_idx on public.categories (shop_id, position);