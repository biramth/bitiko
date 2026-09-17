-- Allow an in-flight campaign state so two operators can't send the same
-- campaign twice, and a partial (timed-out) send can be resumed safely.
alter table public.campaigns drop constraint if exists campaigns_status_check;
alter table public.campaigns
  add constraint campaigns_status_check check (status in ('draft', 'sending', 'sent'));
