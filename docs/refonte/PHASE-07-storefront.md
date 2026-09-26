# PHASE 07 — Storefront engine

> État : ✅ TERMINÉ — 2026-09-25 (DEV uniquement, prod non touchée).
> Journal : 2026-09-25 — contrats + sanitizer + capabilities storefront + bundle audit ;
> livrable ci-dessous.

## Objectif

Moteur data-driven `Store → Pages → Sections → Blocks` (contrats `id/type/content/settings/
layout/responsive/visibility/capabilities`), **séparé** du workspace : le visiteur ne charge ni
code admin, ni code platform, ni modules inutiles. Header/Footer éditables et non obligatoires
(recommandation ≠ obligation). SEO fondamentaux propres (title, meta, OG, canonical, sitemap…).

## Vérifications préalables

- [ ] Auditer le rendu storefront actuel : `StoreLayout`, sections (`features/store-builder/sections/`),
      `templateSections.ts`, `TemplateThumbnail`, routage multi-boutiques (`TenantContext`,
      `middleware.ts`, `sitemap.ts`, `og.ts`), poids JS du visiteur.

## Étapes

1. Figer les contrats Section/Block + validation serveur (whitelist de types ; **jamais de
   `<script>`/JS arbitraire** — blocs et composants contrôlés, HTML sanitizé si nécessaire).
2. Moteur de rendu + migration progressive des sections existantes vers les contrats.
3. Séparation des bundles (route storefront sans code admin), responsive images, lazy loading ;
   budgets §22 de la mission en garde-fous (avertir, pas bloquer).
4. Données indépendantes de la présentation : changer de template ne touche ni produits, ni
   commandes, ni clients, ni URLs (prépare PHASE-08).

## Livrable PHASE 7 COMPLETE (2026-09-25, DEV)

1. Tables créées/modifiées : aucune (PHASE-07 = code uniquement).
2. Migrations effectuées : aucune.
3. Relations : inchangées.
4. Index : inchangés.
5. RLS : inchangée.
6. Policies : inchangées.
7. Fonctions ajoutées/modifiées : aucune (réutilise les RPC P05).
8. Compatibilité legacy : rendu byte-identique (sections legacy sans metadata capabilities +
   fail-open ; `visible` toujours filtré en amont, non touché) ; vitest 152/152 (6 nouveaux) +
   `tsc` + build + lint 0 erreur.
9. Tests créés : `sanitizeSections.test.ts` (6 cas : garde-fous, types inconnus conservés,
   normalisation, gates capabilities).
10. Tests exécutés : suite complète verte.
11. Résultats : tous verts. Bundle audité : shell storefront (`StoreApp`/`StoreLayout`)
    sans code admin/platform (seul `useShopPlan`, hook léger légitime) ; images auditées
    (lazy partout sauf hero LCP en `fetchPriority="high"` — rien à changer).
12. Risques restants / adaptations : budgets chiffrés + mesures Core Web Vitals → P15 ;
    sections métier (services/rdv) et templates orthogonaux → P08/P09 ; enforcement
    entitlements → P10.
13. Fichiers modifiés : `src/types/builder.ts` (contrat `capabilities?`), nouveau
    `sanitizeSections.ts` (+ test), `useStorefrontCapabilities.ts`, `SectionList.tsx`,
    `HomePage.tsx`, `StorePageView.tsx`, `TemplateBody.tsx` + `docs/refonte/`.
14. Prochaine phase recommandée : PHASE-08 (vrais templates préconstruits + galerie/démo).
