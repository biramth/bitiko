-- The new "Témoignages" (testimonials) block is a freely-addable content
-- block like hero/text/image/promo/faq/lookbook/flexible — same bypass class
-- as 0055 closed for "flexible": without this, a free-plan shop could add
-- unlimited testimonial sections via a direct API call and dodge the
-- content-block cap enforced server-side.
create or replace function public.count_custom_sections(p_sections jsonb)
returns integer
language sql
immutable
as $$
  select count(*)::integer
  from jsonb_array_elements(coalesce(p_sections, '[]'::jsonb)) as section
  where section->>'type' in ('hero', 'text', 'image', 'promo', 'faq', 'lookbook', 'flexible', 'testimonials');
$$;
