-- Builder v2 (Shopify-style): each system page (catalogue, product, cart,
-- checkout) gets its own editable body sections. Stores a map of
-- { key: { draft?: sections, published?: sections } } per shop. The home page
-- keeps its existing layout_sections / builder_draft columns.

alter table public.shops
  add column if not exists page_templates jsonb not null default '{}'::jsonb;