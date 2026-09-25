# PHASE 11 — Payment Engine (Wave conservé, abstraction introduite)

> État : ⬜ NON DÉMARRÉ
> Journal : —
> Pré-requis : PHASE-10 ✅.

## Objectif

Passer de `Application → Wave` à `Application → Payment Engine → Provider → Wave`, avec Wave
requalifié en provider `TEMPORARY` **conservé tel quel** (contexte : documents pro incomplets ;
aucune intégration alternative mise en prod tant que légal/technique non réunis).
Demain : Wave, Orange Money, agrégateur, autres, international — sans réécrire Billing.

## Vérifications préalables

- [ ] Auditer : `api/_lib/wave.ts`, `settlePayment.ts`, `wave_payments`, `api/billing/webhook.ts`,
      `create-checkout.ts`, `confirm.ts`, `api/admin/payments.ts`, `cron/renewal-reminders.ts`,
      statuts, réconciliation, coûts provider actuels (non hardcodés : table `provider_costs`).

## Étapes

1. Interface `PaymentProvider` : `createPayment / getPaymentStatus / cancelPayment /
   refundPayment / handleWebhook / reconcile` ; tables `payment_providers`, `payment_transactions`,
   `payment_webhooks`, `payment_reconciliations` (les détails provider ne remontent jamais).
2. Adapter Wave comme premier provider derrière l'interface, à comportement strictement identique
   (preuves manuelles + statuts + relances conservés) ; feature flag de bascule avec retour instantané.
3. Coûts configurables (commission, transaction, payout, change, remboursements) — jamais `fee = 1%`
   en dur ; statuts `Payment Intent → Status → Refund → Reconciliation` tracés.

## Interdits

- Aucune suppression du flux Wave actuel avant parité prouvée ; aucune intégration alternative
  activée en prod dans cette phase.

## Critères de sortie

- [ ] Tous les paiements passent par l'Engine avec Wave, à l'identique (tests + réconciliation).
- [ ] Ajouter un provider fictif en dev ne touche pas Billing (preuve d'abstraction).
- [ ] `PHASE 11 COMPLETE` rédigé.
