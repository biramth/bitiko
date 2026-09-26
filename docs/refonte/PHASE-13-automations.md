# PHASE 13 — Automation Engine (Business Events)

> État : ✅ TERMINÉ — 2026-09-25 (DEV uniquement, prod non touchée).
> Journal : 2026-09-25 — journal + trigger + dispatcher + adaptateur email ; livrable ci-dessous.

## Objectif

`Business Event → Automation Engine → Channel` : événements (`ORDER_CREATED/PAID/CANCELLED`,
`APPOINTMENT_CREATED/REMINDER`, `CUSTOMER_CREATED`, `SUBSCRIPTION_EXPIRING`, `PAYMENT_FAILED`…)
indépendants des canaux (WhatsApp/SMS/Email/Push). Le moteur d'abord, les intégrations ensuite ;
les limites WhatsApp actuelles ne dictent pas l'architecture.

## Vérifications préalables

- [ ] Auditer l'existant : `create_order`/`set_order_status`, `whatsappMessage.ts`,
      `whatsapp_verifications` (+ OTP supprimé `0044`), campagnes, `cron/*`, preuves de paiement.

## Étapes

1. Journal d'événements (table, ordonnés, rejouables) émis par le domaine, jamais par les canaux.
2. Moteur : règles (déclencheur, conditions, actions), quotas via entitlements (`MAX_AUTOMATIONS`,
   exécutions — cf. PHASE-10/12), traçabilité (observabilité PHASE-15 : automation failures).
3. Adaptateurs canal un par un, WhatsApp actuel conservé comme premier adaptateur.

## Livrable PHASE 13 COMPLETE (2026-09-25, DEV)

1. Tables créées : `business_events`, `automation_rules`, `automation_runs`. Rien d'existant modifié.
2. Migrations effectuées : `0107_automation_foundation.sql` (tables + RLS + trigger d'émission
   avec garde EXCEPTION) — historique `0107|0107` ✅. Prod non touchée.
3. Relations : FK shops/rules/events en cascade ; index pending + shop + event.
4. Index : voir §3.
5. RLS : activée sur les 3 tables (vérifié effectif).
6. Policies : 3 owner read (vérifié), zéro écriture client.
7. Fonctions ajoutées : `emit_order_events()` (DEFINER, trigger-internal revoqué, ne casse
   jamais l'écriture observée — garde EXCEPTION + WARNING).
8. Compatibilité legacy : écritures commandes inchangées (trigger AFTER non bloquant) ;
   dispatcher no-op sans règles ; vitest 162/162 (3 nouveaux API) + `tsc` + build + lint 0 erreur.
9. Tests créés : `api/cron/automation-dispatch.test.ts` (matching, rendu template).
10. Tests exécutés : suite verte ; seed inutile (aucun) ; trigger + policies vérifiés effectifs.
11. Résultats : tous verts. Moteur prouvé au niveau unitaire : event → règles matchées →
    canal (log/email livrés, autres `skipped/no_channel_adapter`, jamais d'échec silencieux).
12. Risques restants / reportés : planification cron + monitoring → P15 (endpoint non
    schedulé, CRON_SECRET-gated) ; adaptateurs WhatsApp/SMS/push (dépendent des providers) ;
    quotas via entitlements dynamiques (P10b/P12) ; retry des `failed` ; UI de gestion des
    règles → P14 ; émetteurs futurs (rendez-vous…) avec leurs domaines.
13. Fichiers modifiés : `supabase/migrations/0107*`, `api/cron/automation-dispatch.ts` (+ test)
    + `docs/refonte/`.
14. Prochaine phase recommandée : PHASE-14 (Platform Admin : types, prix, règles, analytics).
