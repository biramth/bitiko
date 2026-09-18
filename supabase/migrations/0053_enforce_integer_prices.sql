-- 0053: prices are always whole FCFA amounts, never store cents.
--
-- Every currency this app supports is rendered with zero decimals
-- (formatCurrency in src/utils/format.ts always passes
-- maximumFractionDigits: 0), and the frontend's normalizePrice()
-- (src/utils/price.ts) rejects a decimal price before it ever reaches the
-- database. This migration turns that assumption into a database
-- guarantee so no write path — including a future one — can sneak a
-- fractional amount into a price-bearing column.
--
-- Each constraint is added defensively: if a table already holds a
-- non-integer value, the block raises a NOTICE naming the column and row
-- count instead of failing the whole migration, and skips adding the
-- constraint there. That keeps this migration non-destructive — nothing
-- is rounded, truncated or overwritten — but it does mean a flagged table
-- needs a human to clean up the offending rows (see the NOTICE's query)
-- before the constraint can be added by a follow-up migration.

do $$
declare
  v_bad_count integer;
begin
  select count(*) into v_bad_count from public.products where price <> trunc(price);
  if v_bad_count > 0 then
    raise notice 'products.price: % row(s) have a non-integer price — constraint not added. Review with: select id, shop_id, price from public.products where price <> trunc(price);', v_bad_count;
  else
    alter table public.products
      add constraint products_price_integer check (price = trunc(price));
  end if;
end $$;

do $$
declare
  v_bad_count integer;
begin
  select count(*) into v_bad_count
  from public.product_variants
  where price is not null and price <> trunc(price);
  if v_bad_count > 0 then
    raise notice 'product_variants.price: % row(s) have a non-integer price — constraint not added. Review with: select id, product_id, price from public.product_variants where price is not null and price <> trunc(price);', v_bad_count;
  else
    alter table public.product_variants
      add constraint product_variants_price_integer check (price is null or price = trunc(price));
  end if;
end $$;

do $$
declare
  v_bad_count integer;
begin
  select count(*) into v_bad_count
  from public.shops
  where delivery_fee <> trunc(delivery_fee)
     or (free_delivery_threshold is not null and free_delivery_threshold <> trunc(free_delivery_threshold));
  if v_bad_count > 0 then
    raise notice 'shops.delivery_fee/free_delivery_threshold: % row(s) have a non-integer value — constraints not added. Review with: select id, delivery_fee, free_delivery_threshold from public.shops where delivery_fee <> trunc(delivery_fee) or (free_delivery_threshold is not null and free_delivery_threshold <> trunc(free_delivery_threshold));', v_bad_count;
  else
    alter table public.shops
      add constraint shops_delivery_fee_integer check (delivery_fee = trunc(delivery_fee)),
      add constraint shops_free_delivery_threshold_integer check (free_delivery_threshold is null or free_delivery_threshold = trunc(free_delivery_threshold));
  end if;
end $$;

do $$
declare
  v_bad_count integer;
begin
  select count(*) into v_bad_count from public.delivery_secteurs where fee <> trunc(fee);
  if v_bad_count > 0 then
    raise notice 'delivery_secteurs.fee: % row(s) have a non-integer fee — constraint not added. Review with: select id, shop_id, fee from public.delivery_secteurs where fee <> trunc(fee);', v_bad_count;
  else
    alter table public.delivery_secteurs
      add constraint delivery_secteurs_fee_integer check (fee = trunc(fee));
  end if;
end $$;
