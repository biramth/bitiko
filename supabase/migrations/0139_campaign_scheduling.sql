-- 0139_campaign_scheduling.sql
--
-- Envoi programmé des campagnes : une campagne (brouillon ou déjà programmée)
-- reçoit une date d'envoi (`scheduled_at`, jour, saisie par l'équipe) et un
-- statut `scheduled`. Le cron quotidien api/cron/automation-dispatch envoie
-- celles dont la date est passée (même moteur que l'envoi immédiat, sans
-- double-envoi). `scheduled_by` mémorise l'auteur pour résoudre l'audience
-- côté cron, où aucun membre n'est connecté.
--
-- Idempotent, re-jouable.

alter table public.campaigns add column if not exists scheduled_at timestamptz;
alter table public.campaigns add column if not exists scheduled_by uuid references auth.users(id) on delete set null;

alter table public.campaigns drop constraint if exists campaigns_status_check;
alter table public.campaigns
  add constraint campaigns_status_check check (status in ('draft', 'scheduled', 'sending', 'sent'));
