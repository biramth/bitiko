# PHASE 07 — Storefront engine

> État : ⬜ NON DÉMARRÉ
> Journal : —
> Pré-requis : PHASE-04 ✅, PHASE-05 ✅.

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

## Critères de sortie

- [ ] Storefront existant rendu par le moteur à l'identique (non-régression visuelle + tests).
- [ ] Score perf visiteur mesuré et meilleur ou égal ; aucun JS admin chargé côté visiteur.
- [ ] `PHASE 7 COMPLETE` rédigé.
