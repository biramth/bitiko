-- 0131 : alertes de stock pour le marchand.
--
-- Deux événements dans le journal `business_events` (PHASE-13), émis quand le
-- stock d'un produit ACTIF franchit un seuil vers le bas, jamais à chaque vente :
--   * STOCK_OUT : le stock tombe à 0 (il était > 0) ;
--   * STOCK_LOW : le stock passe sous le seuil d'alerte de la boutique
--     (`shops.low_stock_threshold`, 5 par défaut) sans atteindre 0.
-- Un produit déjà sous le seuil n'émet rien de plus tant qu'il n'a pas été
-- réapprovisionné puis épuisé à nouveau : pas de spam. Le trigger observe les
-- écritures sans jamais les bloquer (un échec du journal ne casse pas une commande).
-- Idempotent, re-exécutable.

create or replace function public.emit_stock_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_threshold integer;
begin
  if not new.active or new.stock is not distinct from old.stock or new.stock >= old.stock then
    return new;
  end if;

  select coalesce(s.low_stock_threshold, 5) into v_threshold from public.shops s where s.id = new.shop_id;
  v_threshold := coalesce(v_threshold, 5);

  if new.stock <= 0 and old.stock > 0 then
    insert into public.business_events (shop_id, type, payload)
    values (new.shop_id, 'STOCK_OUT', jsonb_build_object(
      'product_id', new.id, 'product_name', new.name, 'stock', new.stock, 'threshold', v_threshold
    ));
  elsif new.stock <= v_threshold and old.stock > v_threshold then
    insert into public.business_events (shop_id, type, payload)
    values (new.shop_id, 'STOCK_LOW', jsonb_build_object(
      'product_id', new.id, 'product_name', new.name, 'stock', new.stock, 'threshold', v_threshold
    ));
  end if;
  return new;
exception
  when others then
    raise warning 'emit_stock_events failed (non-blocking): %', sqlerrm;
    return new;
end;
$$;

revoke all on function public.emit_stock_events() from public, anon, authenticated;

drop trigger if exists products_emit_stock_events on public.products;
create trigger products_emit_stock_events
  after update of stock on public.products
  for each row execute function public.emit_stock_events();

-- Le message « nouvelle commande » dit désormais QUI commande et comment il paie :
-- on enrichit le payload de ORDER_CREATED (mêmes autres champs qu'en 0107).
create or replace function public.emit_order_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.business_events (shop_id, type, payload)
    values (new.shop_id, 'ORDER_CREATED', jsonb_build_object(
      'order_id', new.id, 'order_number', new.order_number, 'total', new.total,
      'customer_name', new.customer_name, 'customer_phone', new.customer_phone,
      'payment_method', new.payment_method
    ));
    return new;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.business_events (shop_id, type, payload)
    values (new.shop_id, 'ORDER_' || upper(new.status), jsonb_build_object(
      'order_id', new.id, 'order_number', new.order_number, 'total', new.total,
      'from_status', old.status, 'to_status', new.status
    ));
    return new;
  end if;
  return coalesce(new, old);
exception
  when others then
    raise warning 'emit_order_events failed (non-blocking): %', sqlerrm;
    return coalesce(new, old);
end;
$$;
