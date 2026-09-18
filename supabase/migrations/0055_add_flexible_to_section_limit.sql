-- The new "Section personnalisée" (flexible) block from the builder's block
-- system is a freely-addable content block like hero/text/image/promo/faq/
-- lookbook — client-side it's already counted by BuilderSidebar's
-- maxCustomSections gate (derived from the registry's category/pinned
-- flags), but 0039_enforce_section_limit.sql's server-side counter hardcodes
-- its own allow-list and doesn't know about it yet. Without this, a
-- free-plan shop could bypass the content-block cap entirely by adding
-- unlimited "flexible" sections (each itself able to hold unlimited nested
-- blocks) via a direct API call, the same class of bypass that migration
-- closed for the other content types.

create or replace function public.count_custom_sections(p_sections jsonb)
returns integer
language sql
immutable
as $$
  select count(*)::integer
  from jsonb_array_elements(coalesce(p_sections, '[]'::jsonb)) as section
  where section->>'type' in ('hero', 'text', 'image', 'promo', 'faq', 'lookbook', 'flexible');
$$;
