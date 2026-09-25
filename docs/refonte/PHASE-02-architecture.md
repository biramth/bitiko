# PHASE 02 — Architecture cible

> État : ⬜ NON DÉMARRÉ
> Journal : —
> Pré-requis : PHASE-01 ✅ (décisions prises sur faits, pas sur suppositions).

## Objectif

Figer l'architecture cible et documenter les décisions, **avant d'écrire la première migration**.
C'est le seul document qui autorise les phases suivantes à diverger du système actuel.

## Vérifications préalables

- [ ] Reprendre le tableau KEEP/REFACTOR/REDESIGN/REBUILD/REMOVE/SECURITY REPLACEMENT de PHASE-01.
- [ ] Trancher `shop` (storefront ? business ? organization ?) et écrire la règle de nommage
      qui en découle pour toute la refonte.
- [ ] Trancher le sort des colonnes `shops` exposées en lecture publique sans besoin storefront :
      `payment_instructions`, `onboarding_responses` (constat PHASE-01 §3.2 — déplacer ou vue
      restreinte, voir PHASE-15 batch).
- [ ] Trancher : organisations introduites **à côté** de `shops` (compat) ou `shops` étendu ?
      (recommandation de départ : nouvelle entité + lien, jamais de renommage brutal — à valider).

## Étapes

1. Décrire l'architecture cible (schéma §68 de la mission) en termes d'objets réels :
   `USER → ORGANIZATION → MEMBERSHIP → ROLES → STORES/DATA/MODULES`, avec
   `Business Type → Capabilities → Modules` et `Subscription → Plan → Entitlements`.
2. Pour chaque entité : responsabilités, relations, ce qu'elle n'est PAS (ex. capability =
   « ce qu'une activité peut utiliser », pas de la logique métier ; entitlement = autorisation
   du plan, pas besoin métier).
3. Écrire la stratégie de migration globale `OLD → COMPAT → NEW → MIGRATION → REMOVE LEGACY`
   avec, par chantier, l'emplacement exact de la couche de compatibilité.
4. Documenter les décisions dans `docs/architecture/`, `docs/security/`, `docs/billing/`,
   `docs/multi-tenancy/`, `docs/page-builder/`, `docs/business-types/`, `docs/payments/`,
   `docs/economics/`, `docs/deployment/` (créer uniquement les dossiers tranchés ici).
5. Figer les conventions : nommage tables/colonnes, erreurs API, `Authentication → Organization
   Context → Permission → Entitlement → Validation → Business Logic → Database` pour chaque endpoint.
6. Valider que chaque phase 03–17 a des pré-requis satisfaits et aucun angle mort (matrice
   phases × dépendances en annexe).

## Interdits

- Aucune migration, aucun code métier. Décisions écrites et relues uniquement.

## Critères de sortie

- [ ] Toute décision structurante est écrite avec ses alternatives rejetées et pourquoi.
- [ ] Aucune phase 03–17 ne démarre sur une hypothèse non tranchée ici.
- [ ] Revue du document par le décideur (validation explicite, datée dans le Journal).

## Livrable

`PHASE 2 COMPLETE` + dossiers `docs/*` créés et PHASE-03 débloquée.
