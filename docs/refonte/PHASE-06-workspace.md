# PHASE 06 — Business Workspace

> État : ⬜ NON DÉMARRÉ
> Journal : —
> Pré-requis : PHASE-05 ✅.

## Objectif

Workspace **généré** depuis `Business Type + Capabilities + Plan Entitlements + Modules activés`
(ex. Restaurant → Commandes/Menu/Réservations/Livraison ; Salon → Rendez-vous/Calendrier/Équipe),
avec Beginner/Advanced Mode. Fini le dashboard identique pour tous.

## Vérifications préalables

- [ ] Auditer le dashboard actuel : `AdminLayout.tsx` + `SidebarNav`, pages admin, guided-tour,
      ce qui est déjà piloté par le type vs en dur.

## Étapes

1. Définir le contrat `Module` (id, capabilities requises, entitlements requis, routes, nav).
2. Générateur de navigation + dashboard : résoudre modules visibles/autorisés côté serveur,
   frontend dérivé (jamais de contrôle d'accès purement frontend).
3. Migrer les modules existants (commandes, produits, clients, analytics…) un par un derrière
   le contrat, avec feature flag par module si besoin.
4. Onboarding (PHASE-05 §4) branché : le workspace recommandé découle du type choisi.

## Critères de sortie

- [ ] Deux business types différents obtiennent deux workspaces différents, testés.
- [ ] Un module sans entitlement est injoignable **aussi via API directe** (test négatif).
- [ ] `PHASE 6 COMPLETE` rédigé.
