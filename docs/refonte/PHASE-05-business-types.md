# PHASE 05 — Business Types + Capabilities (activation)

> État : ⬜ NON DÉMARRÉ
> Journal : —
> Pré-requis : PHASE-03 ✅, PHASE-04 ✅.

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

## Interdits

- Pas de refonte frontend globale ; pas de suppression de `verticals.ts` tant qu'un flux le lit.

## Critères de sortie

- [ ] Nouveau type ajoutable depuis Platform sans code ; capabilities lues côté serveur.
- [ ] Boutiques legacy (TEXT) et nouvelles (FK) cohabitent, tests des deux chemins verts.
- [ ] `PHASE 5 COMPLETE` rédigé ; STOP et présentation avant PHASE-06.
