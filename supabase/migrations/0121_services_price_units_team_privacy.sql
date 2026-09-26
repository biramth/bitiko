-- 0121 : cohérence des prix de prestations + vie privée de l'équipe vitrine.
--
-- 1. Les prix de `services` étaient saisis ×100 (« centimes ») alors que tout le
--    reste du produit (products, orders, plans) stocke des unités entières
--    (0053 enforce_integer_prices) et que le XOF n'a pas de sous-unité. On
--    ramène les lignes existantes à des unités entières, une seule fois : le
--    commentaire de colonne sert de marqueur pour que la migration reste
--    rejouable sans diviser deux fois.
-- 2. `team_members` exposait téléphone et email de chaque équipier à tout
--    visiteur (grant select anon sur toute la table). Les contacts ne sont
--    publics que si le marchand le décide (`show_contact`) ; la vitrine lit la
--    vue `team_members_public`, la table brute est réservée à l'équipe.
-- Idempotent, re-exécutable.

-- ── 1. Prix en unités entières ────────────────────────────────────────────

do $$
begin
  if coalesce(col_description('public.services'::regclass,
       (select attnum from pg_attribute where attrelid = 'public.services'::regclass and attname = 'price')), '')
     not like '%unités entières%' then
    update public.services set price = round(price / 100.0)::integer where price > 0;
  end if;
end;
$$;

comment on column public.services.price is
  'Prix en unités entières de la devise de la boutique (unités entières, comme products.price).';

-- ── 2. Contacts d'équipe : opt-in par équipier ────────────────────────────

alter table public.team_members
  add column if not exists show_contact boolean not null default false;

comment on column public.team_members.show_contact is
  'true = téléphone/email affichés publiquement sur la vitrine (vue team_members_public).';

-- Comportement existant préservé : les équipiers déjà renseignés restent
-- visibles tant que le marchand n'a pas décidé autrement (première exécution).
do $$
begin
  if not exists (
    select 1 from pg_views where schemaname = 'public' and viewname = 'team_members_public'
  ) then
    update public.team_members set show_contact = true where phone is not null or email is not null;
  end if;
end;
$$;

-- Lecture brute : équipe seulement (plus de lecture publique de la table).
drop policy if exists "team_members: public read active" on public.team_members;
drop policy if exists "team_members: staff read" on public.team_members;
create policy "team_members: staff read" on public.team_members
  for select using (public.shop_role(shop_id) in ('owner', 'manager', 'vendeur'));

-- Vue publique : équipiers actifs, contacts masqués sauf opt-in. Volontairement
-- non security_invoker : c'est elle qui porte l'accès public, la table est fermée.
create or replace view public.team_members_public as
  select
    id,
    shop_id,
    name,
    role,
    specialty,
    avatar_url,
    rating,
    sort_order,
    created_at,
    case when show_contact then phone else null end as phone,
    case when show_contact then email else null end as email
  from public.team_members
  where active = true;

revoke all on public.team_members_public from public;
grant select on public.team_members_public to anon, authenticated;

revoke select on public.team_members from anon;
