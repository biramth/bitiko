-- 0147 : le SEO avancé des pages est une capacité du plan Essentiel et plus.
--
-- Titre, description, image de partage et exclusion Google d'une page
-- personnalisée (pages.seo_title / seo_description / og_image / noindex)
-- n'étaient réservés que dans l'interface (Plan.advancedSeo, src/config/plans.ts) :
-- un propriétaire pouvait contourner le verrou en écrivant directement via
-- l'API Supabase avec sa propre session, comme pour les plafonds fermés par
-- 0027 et 0039. Cette migration applique la règle en base.
--
--   MAX_PAGES_WITH_SEO   pages portant du SEO avancé   free 0 · essential illimité · pro illimité
--
-- Lue dans `plan_limits` (source unique, modifiable sans déploiement, NULL =
-- illimité), comme les autres plafonds ; passer free à 1 ouvrirait le SEO sur
-- une page sans nouvelle migration. Les bases du SEO (balises automatiques, sitemap,
-- aperçus de partage, redirections de slug) restent pour tous : seuls
-- l'ajout et la modification de ces quatre champs sont contrôlés.
-- Retirer une personnalisation (remettre à vide / false) reste toujours
-- permis, y compris après un retour au plan gratuit : le commerçant n'est
-- jamais coincé avec un réglage qu'il ne peut plus défaire.
-- Idempotent, re-exécutable.

insert into public.plan_limits (plan_key, code, max_value) values
  ('free', 'MAX_PAGES_WITH_SEO', 0),
  ('essential', 'MAX_PAGES_WITH_SEO', null),
  ('pro', 'MAX_PAGES_WITH_SEO', null)
on conflict do nothing;

create or replace function public.enforce_page_advanced_seo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max integer;
  v_count integer;
  v_changes_seo boolean;
begin
  -- Ne compte que ce qui AJOUTE ou MODIFIE une valeur : remettre à vide est libre.
  v_changes_seo :=
    (new.seo_title is not null and new.seo_title is distinct from (case when tg_op = 'UPDATE' then old.seo_title end))
    or (new.seo_description is not null and new.seo_description is distinct from (case when tg_op = 'UPDATE' then old.seo_description end))
    or (new.og_image is not null and new.og_image is distinct from (case when tg_op = 'UPDATE' then old.og_image end))
    or (new.noindex is true and new.noindex is distinct from (case when tg_op = 'UPDATE' then old.noindex end));

  if not v_changes_seo then
    return new;
  end if;

  v_max := public.plan_limit(public.effective_plan_key(new.shop_id), 'MAX_PAGES_WITH_SEO');
  if v_max is null then
    return new;
  end if;

  select count(*) into v_count
  from public.pages
  where shop_id = new.shop_id
    and id <> new.id
    and (seo_title is not null or seo_description is not null or og_image is not null or noindex is true);

  if v_count >= v_max then
    raise exception 'plan_limit_exceeded: le plan actuel n''inclut pas le référencement avancé des pages'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_page_advanced_seo() from public, anon, authenticated;

drop trigger if exists pages_enforce_advanced_seo on public.pages;
create trigger pages_enforce_advanced_seo
  before insert or update of seo_title, seo_description, og_image, noindex on public.pages
  for each row execute function public.enforce_page_advanced_seo();
