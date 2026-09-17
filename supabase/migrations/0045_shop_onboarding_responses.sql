-- The merchant's structured onboarding answers (what they sell, how they
-- deliver, their story, a FAQ…) — captured during onboarding so the storefront
-- can be generated from real answers instead of generic template copy.
-- Kept on the row so re-applying a style later (the builder's "Styles" tab)
-- can re-personalize the layout from the same answers. Null for shops that
-- predate these questions.

alter table public.shops
  add column onboarding_responses jsonb;

comment on column public.shops.onboarding_responses is
  'The merchant''s onboarding answers (description, offering, delivery/payment options, story, FAQ) that personalized the generated storefront. Null for shops that predate these questions.';