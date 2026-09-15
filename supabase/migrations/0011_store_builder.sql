-- Visual store builder: an ordered list of layout sections (published home
-- page) plus a broader theme token set layered on top of the existing
-- `theme_color` accent, and a single draft blob a merchant edits before
-- publishing. Defaults below reproduce today's hard-coded home page and
-- current visual defaults exactly, so existing shops render unchanged until
-- a merchant opens the builder.

alter table public.shops
  add column layout_sections jsonb not null default '[
    {"id":"header-default","type":"header","visible":true,"config":{"showLogo":true,"showCatalogLink":true,"showContactLink":true,"sticky":true}},
    {"id":"hero-default","type":"hero","visible":true,"config":{"eyebrow":"Boutique en ligne","heading":"","subheading":"","showBanner":true}},
    {"id":"categories-default","type":"categories","visible":true,"config":{"heading":""}},
    {"id":"products-default","type":"products","visible":true,"config":{"heading":"Nos produits","sort":"recent","limit":12}},
    {"id":"footer-default","type":"footer","visible":true,"config":{"showContact":true,"showAddress":true,"showWhatsapp":true,"showSocialLinks":true,"copyrightText":""}}
  ]'::jsonb,
  add column theme_config jsonb not null default '{
    "secondaryColor":"#f7e6d0",
    "textColor":"#17152e",
    "backgroundColor":"#ffffff",
    "buttonColor":"",
    "font":"sora-inter",
    "textScale":"base",
    "radius":"none",
    "contentWidth":"normal"
  }'::jsonb,
  add column builder_draft jsonb;
