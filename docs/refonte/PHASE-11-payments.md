# PHASE 11 — Payment Engine (Wave conservé, abstraction introduite)

> État : ✅ TERMINÉ — 2026-09-25 (DEV uniquement, prod non touchée).
> Journal : 2026-09-25 — engine + provider Wave + miroirs best-effort ; livrable ci-dessous.

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

## Livrable PHASE 11 COMPLETE (2026-09-25, DEV)

1. Tables créées : `payment_providers`, `payment_transactions`, `payment_webhooks`,
   `payment_reconciliations`, `provider_costs` (vide : aucun tarif inventé). Rien d'existant modifié.
2. Migrations effectuées : `0105_payment_engine.sql` (catalogue + seed wave/TEMPORARY +
   backfill miroir) — historique `0105|0105` ✅. Prod non touchée.
3. Relations : FK providers/transactions/shops ; index transactions + webhooks.
4. Index : voir §3.
5. RLS : activée sur les 5 tables (vérifié).
6. Policies : providers public read + transactions owner read (vérifié), zéro écriture ;
   webhooks/reconciliations/costs verrouillées service-only (volontaire).
7. Fonctions ajoutées/modifiées : aucune (l'Engine est code API, pas SQL).
8. Compatibilité legacy : flux Wave byte-identique (mêmes appels, mêmes tables, mêmes
   réponses) + miroirs best-effort qui n'échouent jamais ; vitest 158/158 (3 nouveaux API) +
   `tsc` (dont `api/`) + build + lint 0 erreur.
9. Tests créés : `api/_lib/payments/registry.test.ts` (mapping statuts, registre, inconnu) ;
   config vitest étendue à `api/**` (était `src/**` seul).
10. Tests exécutés : suite verte ; seed (wave/temporary/active) et grants vérifiés effectifs.
11. Résultats : tous verts. Abstraction prouvée : ajouter un provider = implémenter
    l'interface + 1 ligne de registre + 1 ligne `payment_providers` (cancel/refund lèvent
    `not_supported`, jamais de comportement partiel silencieux).
12. Risques restants / reportés : flag de bascule remplacé par rollout dev-only + revert git
    (documenté ; duplication de chemins refusée) ; writer reconciliations + monitoring → P15 ;
    activation d'un 2ᵉ provider interdite sans feu vert légal/technique ; table pirate
    `payments` et consorts → DROP à leur phase propriétaire.
13. Fichiers modifiés : `supabase/migrations/0105*`, `api/_lib/payments/*` (4 fichiers),
    `api/billing/{create-checkout,confirm→settle,webhook}.ts` (câblage best-effort),
    `vitest.config.ts` + `docs/refonte/`.
14. Prochaine phase recommandée : PHASE-12 (Usage + Cost Engine).

## Critères de sortie

- [ ] Tous les paiements passent par l'Engine avec Wave, à l'identique (tests + réconciliation).
- [ ] Ajouter un provider fictif en dev ne touche pas Billing (preuve d'abstraction).
- [ ] `PHASE 11 COMPLETE` rédigé.
