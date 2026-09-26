-- 0127 : le propriétaire gère lui-même ses règles d'automatisation.
--
-- Le moteur (0107) tournait mais les règles ne se créaient que par SQL. On
-- ouvre l'écriture au PROPRIÉTAIRE de la boutique, avec des garde-fous côté
-- base (le frontend n'est jamais la seule barrière) :
--   * une règle par (boutique, événement, canal) ;
--   * gabarit borné (taille) ; au plus 30 règles par boutique ;
--   * seuls les canaux réellement branchés (log, email) sont activables ;
--     whatsapp/sms/push restent dormants, comme au dispatcher.
-- Idempotent, re-exécutable.

create unique index if not exists automation_rules_shop_event_channel_uniq
  on public.automation_rules (shop_id, event_type, channel);

alter table public.automation_rules drop constraint if exists automation_rules_template_size;
alter table public.automation_rules
  add constraint automation_rules_template_size check (pg_column_size(template) < 8192);

create or replace function public.guard_automation_rule()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.enabled and new.channel not in ('log', 'email') then
    raise exception 'channel % is not available yet', new.channel using errcode = '23514';
  end if;
  if tg_op = 'INSERT' and (
    select count(*) from public.automation_rules where shop_id = new.shop_id
  ) >= 30 then
    raise exception 'too many automation rules for this shop' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_automation_rule() from public, anon, authenticated;

drop trigger if exists automation_rules_guard on public.automation_rules;
create trigger automation_rules_guard
  before insert or update on public.automation_rules
  for each row execute function public.guard_automation_rule();

drop policy if exists "automation_rules: owner insert" on public.automation_rules;
create policy "automation_rules: owner insert" on public.automation_rules
  for insert with check (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

drop policy if exists "automation_rules: owner update" on public.automation_rules;
create policy "automation_rules: owner update" on public.automation_rules
  for update using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

drop policy if exists "automation_rules: owner delete" on public.automation_rules;
create policy "automation_rules: owner delete" on public.automation_rules
  for delete using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

grant select, insert, update, delete on public.automation_rules to authenticated;
