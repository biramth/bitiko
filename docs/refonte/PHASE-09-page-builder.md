# PHASE 09 — Page Builder

> État : ⬜ NON DÉMARRÉ
> Journal : —
> Pré-requis : PHASE-07 ✅, PHASE-08 ✅.

## Objectif

Éditeur visuel immersif (toolbar + sidebar sections/blocs/settings/design/effects + preview live,
sélection directe, drag & drop, duplication/masquage, previews desktop/tablet/mobile, sauvegarde,
publication, undo/redo si possible), construit sur les contrats PHASE-07 — jamais de composants
codés en dur par métier (`FashionTemplate.tsx` & co interdits).

## Vérifications préalables

- [ ] Auditer le builder actuel : `StoreBuilderPage.tsx` (+ `buildTarget`, `ensurePinnedSections`),
      `TemplateLibraryPanel`, sections inline (`inline/`), `useEmbeddedPreview`, limites de plan
      (`enforce_*` section/variantes/photos).

## Étapes

1. État éditeur → contrat de données (mêmes `Section/Block` que le rendu, ajout métadonnées
   d'édition) ; sauvegarde brouillon vs publication (étendre `shop_publish_history`, pas remplacer).
2. Sécurité : whitelist stricte, pas de JS arbitraire, uploads validés (MIME, extension, taille,
   nommage, isolation, URLs contrôlées — voir aussi PHASE-15).
3. Limites de plan appliquées côté serveur (réutiliser `enforce_*`, brancher futurs entitlements).
4. Mobile-first : comportements responsive simples (Grid/List/Horizontal Scroll), jamais d'overflow
   global ; effets (hover, reveal, parallax…) configurables, **sans dégrader le mobile**.

## Critères de sortie

- [ ] Parcours éditer → prévisualiser → publier testé E2E ; site publié identique à la preview.
- [ ] Tentative d'injection (script/HTML) neutralisée (tests négatifs).
- [ ] `PHASE 9 COMPLETE` rédigé.
