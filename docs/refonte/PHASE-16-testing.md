# PHASE 16 — Testing (stratégie complète)

> État : ⬜ NON DÉMARRÉ
> Journal : —
> Pré-requis : PHASE-03 à PHASE-15 (objets à tester existants).

## Objectif

Vraie stratégie : **unit** (pricing, permissions, capabilities, normalisation téléphone/prix —
`normalize_sn_phone`, prix entiers `0053` —, billing, usage, calculs), **intégration** (auth,
isolation tenant, API, DB, paiements, webhooks), **E2E** (signup → business → type → store →
template → produit → publication → commande/réservation → dashboard) + scénarios négatifs.

## Vérifications préalables

- [ ] Auditer l'existant : `vitest.config.ts`, 13 fichiers / 138 tests, `npm run test`,
      ce qui est déjà couvert (billing ? capabilities ? RLS ?).

## Étapes

1. Tests DB/RLS explicites et rejouables (Business A ≠ Business B ; membre sans permission :
   billing/produits/analytics/team refusés ; Free ≠ Pro via API directe).
2. Tests d'API par endpoint selon la chaîne PHASE-02 (auth → contexte → permission →
   entitlement → validation → logique).
3. E2E des parcours critiques (§67 de la mission : côté user + côté admin Bitiko) sur preview,
   données seedées, nettoyées après exécution.

## Critères de sortie

- [ ] Couverture des chemins critiques + tous les tests négatifs de la mission verts, en CI.
- [ ] `PHASE 16 COMPLETE` rédigé.
