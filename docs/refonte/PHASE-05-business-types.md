# PHASE 05 — Business Types + Capabilities (activation)

> État : ✅ TERMINÉ — 2026-09-25 (DEV uniquement, prod non touchée).
> Journal : 2026-09-25 — migration 0101+0102 + API admin + outil Platform + service
> capabilities + types TS ; livrable ci-dessous.

## Objectif

Rendre les types/capabilities **utilisables** : référentiel administrable, couche de compat avec
`shops.business_type`, sans `if businessType === "restaurant"` dans le code métier.

## Vérifications préalables

- [ ] Lister tous les branchements actuels sur le type : `verticals.ts`, `storeTemplates.ts`,
      `templateSections.ts`, `OnboardingPage.tsx`, `SettingsPage.tsx`, `TemplateLibraryPanel.tsx`,
      `StoreBuilderPage.tsx`, `shop.service.ts`, `savedTheme.ts`, `builder.ts`, `LookbookSection.tsx`.

## Étapes

1. Seed/gestion : CRUD Platform des types + associations (statuts `active/deprecated/draft`,
   slug immuable) ; un admin ajoute un type **sans modifier le code** (capabilities par cases).
2. Compat : finaliser `shops.business_type_id` (backfill, puis NOT NULL seulement quand tous les
   flux écrivent le nouveau champ) ; lecture unifiée « type effectif » (nouveau champ sinon
   legacy TEXT) marquée `LEGACY` avec retrait planifié.
3. Remplacer progressivement les `if` par des lectures de capabilities (`HAS_*`) en commençant
   par les points les moins risqués (recommandations, filtres) — jamais de refonte d'un coup.
4. Exposer côté serveur : `getCapabilities(businessType)` / `getBusinessType(slug)` pour le
   workspace (PHASE-06), le storefront (PHASE-07) et l'onboarding
   (`Business Type → Capabilities → Workspace → Storefront → Template → Customization`).

## Livrable PHASE 5 COMPLETE (2026-09-25, DEV `tlqgcmbdethmhqrablcy`)

1. Tables créées/modifiées : `shops.business_type_id` (nullable, FK RESTRICT, index) ; rien d'autre.
2. Migrations effectuées : `0101_shop_business_type_link.sql` (colonne + backfill TEXT→slug +
   `shop_business_type_slug()` + `business_type_capability_codes()`, grants anon/authenticated
   explicites) + `0102_cleanup_duplicate_type_index.sql` (index pirate `idx_*`) — historique
   `0101|0101`, `0102|0102` ✅. Prod non touchée.
3. Relations : FK shops→business_types (RESTRICT : pas de DELETE d'un type référencé).
4. Index : `shops_business_type_id_idx` ; doublon supprimé (advisors clean).
5. RLS : inchangée (colonne hérite des policies shops ; helpers lisent des référentiels publics).
6. Policies : aucune ajoutée/modifiée.
7. Fonctions ajoutées : les 2 RPC ci-dessus (INVOKER, `search_path` fixe, testées : `mode` → 12 codes).
8. Compatibilité legacy : `shops.business_type` TEXT intact et toujours lu en fallback
   (`shop_business_type_slug`) ; backfill rejouable (NOTICE si valeur inconnue ; dev : no-op) ;
   `verticals.ts` et tous les flux actuels inchangés ; vitest 140/140 (2 nouveaux) + `tsc` + build
   + lint 0 erreur.
9. Tests créés : `businessType.service.test.ts` (groupement capabilities) ; vérifications catalogue.
10. Tests exécutés : RPC effectives, grants, seed mapping, advisors (zéro finding nouveau),
    suite complète verte.
11. Résultats : tous verts. Nouveau type créable depuis `/plateforme/types` (owner/admin,
    slug immuable, statuts, mapping capabilities par cases) — sans toucher au code.
12. Risques restants : UI existantes (onboarding/settings/templates) lisent encore `verticals.ts`
    → bascule en P06/P07 ; ~12 tables pirates restantes (`plans`, `invoices`, `payments`,
    `payment_providers`, `events`…) → DROP aux phases propriétaires (P10/P11/P13) ;
    `database.types.ts` complété chirurgicalement (régénération complète impossible : fichier
    augmenté main avec types custom).
13. Fichiers modifiés : `supabase/migrations/0101*`, `0102*`, `api/admin/platform.ts`,
    `api/_lib/supabaseAdmin.ts`, `vercel.json`, `src/services/admin.service.ts`,
    `src/services/businessType.service.ts` (+ test), `src/features/platform/BusinessTypesTool.tsx`,
    `src/features/platform/permissions.ts`, `src/features/platform/PlatformLayout.tsx`,
    `src/pages/platform/PlatformBusinessTypesPage.tsx`, `src/routes/PlatformRoutes.tsx`,
    `src/types/database.types.ts` (+3 RPC).
14. Prochaine phase recommandée : PHASE-06 (workspace généré depuis capabilities + entitlements).

## Critères de sortie

- [ ] Nouveau type ajoutable depuis Platform sans code ; capabilities lues côté serveur.
- [ ] Boutiques legacy (TEXT) et nouvelles (FK) cohabitent, tests des deux chemins verts.
- [ ] `PHASE 5 COMPLETE` rédigé ; STOP et présentation avant PHASE-06.
