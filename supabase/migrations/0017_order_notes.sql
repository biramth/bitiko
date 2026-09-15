-- Internal notes a merchant can leave on an order (never shown to the
-- customer) — e.g. "à rappeler avant livraison".

alter table public.orders add column notes text;
