-- Per-shop accent color (Shopify-style "theme color"). Applied storefront-side
-- as a CSS custom property so buttons/highlights reflect each merchant's own
-- branding instead of one fixed platform color. Defaults to the platform's
-- terracotta so existing shops look unchanged until a merchant picks their own.
alter table public.shops
  add column theme_color text not null default '#d9612e'
  check (theme_color ~* '^#[0-9a-f]{6}$');
