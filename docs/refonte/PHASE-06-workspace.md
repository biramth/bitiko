# PHASE 06 — Business Workspace

> État : ✅ TERMINÉ — 2026-09-25 (DEV uniquement, prod non touchée).
> Journal : 2026-09-25 — registre + resolver + sidebar générée + `business_type_id` à la
> création ; livrable ci-dessous.

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

## Livrable PHASE 6 COMPLETE (2026-09-25, DEV)

1. Tables créées/modifiées : aucune (PHASE-06 = code uniquement).
2. Migrations effectuées : aucune.
3. Relations : inchangées.
4. Index : inchangés.
5. RLS : inchangée (aucune policy touchée).
6. Policies : inchangées.
7. Fonctions ajoutées/modifiées : aucune (réutilise `shop_business_type_slug()` +
   `business_type_capability_codes()` de P05).
8. Compatibilité legacy : sidebar byte-identique pour les commerces (test resolver :
   set commerce → les 5 entrées historiques) ; `createShop` écrit `business_type_id`
   en best-effort sans jamais faire échouer la création ; vitest 146/146 (6 nouveaux) +
   `tsc` + build + lint 0 erreur.
9. Tests créés : `src/features/workspace/modules.test.ts` (5 cas : set commerce complet,
   fail-open `null`, set services → dashboard+clients, set vide → dashboard seul,
   disabled/entitlements, ordre des groupes).
10. Tests exécutés : suite complète verte ; deux jeux de capabilities distincts donnent deux
    workspaces distincts (critère).
11. Résultats : tous verts.
12. Risques restants / adaptations actées : (a) enforcement entitlements côté API → P10
    (le registre pilote la visibilité ; le critère « injoignable via API » déménage en P10) ;
    (b) contenu du dashboard inchangé (l'entrée workspace = la nav ; cartes par métier en P07
    avec le frontstore adaptatif) ; (c) onboarding lit encore `verticals.ts` pour le choix,
    mais écrit désormais le FK.
13. Fichiers modifiés : `src/features/workspace/modules.ts` + `useWorkspaceModules.ts` (+ test),
    `src/layouts/AdminLayout.tsx` (sidebar générée), `src/services/shop.service.ts`
    (`business_type_id` à la création), `src/types/database.types.ts` (colonnes shops +
    table `business_types`) + `docs/refonte/`.
14. Prochaine phase recommandée : PHASE-07 (moteur storefront + adaptation par capabilities).
