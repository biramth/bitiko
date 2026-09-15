-- The public storefront (anonymous visitors) needs to know whether a shop is
-- on Pro to decide whether to show "Propulsé par Bitiko" in the footer. Plan
-- tier + expiry isn't sensitive data (comparable to any SaaS showing "Pro"
-- badges publicly), so widen read access to everyone — this only touches
-- SELECT. There is still no insert/update/delete policy for anon/authenticated
-- on this table, so a merchant still has no way to grant themselves a paid
-- plan from the browser; only server-side code with the service_role key can
-- write here.

create policy "shop_subscriptions: public read" on public.shop_subscriptions
  for select using (true);
