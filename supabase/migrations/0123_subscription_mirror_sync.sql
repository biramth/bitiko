-- 0123 : le miroir `subscriptions` (+ `subscription_history`) suit désormais
-- `shop_subscriptions`, seule table écrite par l'app (Wave, preuves manuelles,
-- codes promo). Sans cela, `subscriptions` n'était remplie qu'une fois (backfill
-- 0104) puis dérivait. Le trigger ne doit JAMAIS bloquer l'encaissement : toute
-- erreur du miroir est réduite à un WARNING.
-- Idempotent, re-exécutable.

create or replace function public.sync_subscription_mirror()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous text;
  v_subscription_id uuid;
begin
  begin
    select plan_key into v_previous from public.subscriptions where shop_id = new.shop_id;

    insert into public.subscriptions (shop_id, plan_key, status, current_period_end)
    values (new.shop_id, new.plan, new.status, new.current_period_end)
    on conflict (shop_id) do update
      set plan_key = excluded.plan_key,
          status = excluded.status,
          current_period_end = excluded.current_period_end
    returning id into v_subscription_id;

    if v_previous is distinct from new.plan then
      insert into public.subscription_history (subscription_id, from_plan, to_plan, reason)
      values (v_subscription_id, v_previous, new.plan, 'sync:shop_subscriptions');
    end if;
  exception when others then
    raise warning 'sync_subscription_mirror failed for shop %: %', new.shop_id, sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.sync_subscription_mirror() from public, anon, authenticated;

drop trigger if exists shop_subscriptions_sync_mirror on public.shop_subscriptions;
create trigger shop_subscriptions_sync_mirror
  after insert or update on public.shop_subscriptions
  for each row execute function public.sync_subscription_mirror();

-- Rattrapage de la dérive accumulée depuis le backfill initial.
insert into public.subscriptions (shop_id, plan_key, status, current_period_end)
select s.shop_id, s.plan, s.status, s.current_period_end
from public.shop_subscriptions s
on conflict (shop_id) do update
  set plan_key = excluded.plan_key,
      status = excluded.status,
      current_period_end = excluded.current_period_end;
