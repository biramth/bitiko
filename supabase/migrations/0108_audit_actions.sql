-- 0108_audit_actions.sql — PHASE-14 Platform Admin (audit coverage).
--
-- Extends admin_audit_log's action whitelist to the sensitive flows audited in
-- code: biztype_save (business catalog, PHASE-05 — its inserts currently FAIL
-- on the old check!), payment_approve / payment_reject (manual money decisions),
-- promo_save (free-subscription grants). No data change; constraint only.
-- Idempotent, re-runnable.

alter table public.admin_audit_log
  drop constraint if exists admin_audit_log_action_check;

alter table public.admin_audit_log
  add constraint admin_audit_log_action_check
  check (action in (
    'support_access', 'user_delete', 'team_add',
    'biztype_save', 'payment_approve', 'payment_reject', 'promo_save'
  ));
