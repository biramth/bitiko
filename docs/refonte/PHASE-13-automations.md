# PHASE 13 — Automation Engine (Business Events)

> État : ⬜ NON DÉMARRÉ
> Journal : —
> Pré-requis : PHASE-05 ✅, PHASE-10 ✅.

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

## Critères de sortie

- [ ] `ORDER_CREATED → message WhatsApp` de bout en bout sur dev, rejouable, quota appliqué.
- [ ] `PHASE 13 COMPLETE` rédigé.
