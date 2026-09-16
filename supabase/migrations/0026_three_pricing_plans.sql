-- Introduce the paid Essential tier while preserving existing free and Pro rows.
-- The frontstore remains available on every plan; plan checks only govern
-- merchant tooling and entitlements in the application/API layer.

alter table public.shop_subscriptions
  drop constraint if exists shop_subscriptions_plan_check;

alter table public.shop_subscriptions
  add constraint shop_subscriptions_plan_check
  check (plan in ('free', 'essential', 'pro'));

alter table public.wave_payments
  drop constraint if exists wave_payments_plan_check;

alter table public.wave_payments
  add constraint wave_payments_plan_check
  check (plan in ('essential', 'pro'));