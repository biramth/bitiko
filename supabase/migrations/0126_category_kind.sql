-- 0126 : catégories séparées entre produits et prestations.
--
-- Les prestations réutilisaient la table `categories` des produits : les deux
-- catalogues se polluaient (une catégorie « Coupes » dans les filtres produits,
-- « Robes » dans les filtres prestations). `kind` sépare les deux listes sans
-- nouvelle table ni changement de FK.
--   * backfill : une catégorie référencée par des prestations et par aucun
--     produit passe en 'service' ; les catégories partagées restent 'product'
--     (aucun rattachement existant n'est cassé) ;
--   * garde-fou : un produit ne peut viser qu'une catégorie 'product', une
--     prestation qu'une catégorie 'service' — vérifié seulement quand le
--     rattachement CHANGE (les lignes existantes restent modifiables).
-- Idempotent, re-exécutable.

alter table public.categories
  add column if not exists kind text not null default 'product';

alter table public.categories drop constraint if exists categories_kind_check;
alter table public.categories
  add constraint categories_kind_check check (kind in ('product', 'service'));

update public.categories c
set kind = 'service'
where c.kind = 'product'
  and exists (select 1 from public.services s where s.category_id = c.id)
  and not exists (select 1 from public.products p where p.category_id = c.id);

create index if not exists categories_shop_kind_idx on public.categories (shop_id, kind, position);

create or replace function public.enforce_category_kind()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expected text := case tg_table_name when 'services' then 'service' else 'product' end;
  v_kind text;
begin
  if new.category_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.category_id is not distinct from old.category_id then
    return new;
  end if;
  select kind into v_kind from public.categories where id = new.category_id;
  if v_kind is not null and v_kind <> v_expected then
    raise exception 'category kind mismatch: % expected', v_expected using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_category_kind() from public, anon, authenticated;

drop trigger if exists services_enforce_category_kind on public.services;
create trigger services_enforce_category_kind
  before insert or update of category_id on public.services
  for each row execute function public.enforce_category_kind();

drop trigger if exists products_enforce_category_kind on public.products;
create trigger products_enforce_category_kind
  before insert or update of category_id on public.products
  for each row execute function public.enforce_category_kind();
