-- 0117 : gabarits Barber + Institut pour Beauté & Bien-être (multi-template
-- par métier : le type beaute devient compatible avec 3 gabarits).
-- Idempotent, re-exécutable.

insert into public.templates (slug, name, description) values
  ('barber', 'Barber', 'Sombre et masculin — coupe homme, barbe et rituels du barbier.'),
  ('institut', 'Institut & Spa', 'Doux et épuré — soins visage, corps et parenthèse détente.')
on conflict (slug) do nothing;

insert into public.template_business_types (template_id, business_type_id)
select t.id, b.id
from public.templates t
join public.business_types b on b.slug = 'beaute'
where t.slug in ('barber', 'institut')
on conflict do nothing;
