# PHASE 09 — Page Builder

> État : ✅ TERMINÉ — 2026-09-25 (DEV uniquement, prod non touchée).
> Journal : 2026-09-25 — audit éditeur + sanitization à la publication ; livrable ci-dessous.

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

## Livrable PHASE 9 COMPLETE (2026-09-25, DEV)

1. Tables créées/modifiées : aucune (PHASE-09 = code uniquement).
2. Migrations effectuées : aucune.
3. Relations / 4. Index / 5. RLS / 6. Policies : inchangés.
7. Fonctions ajoutées/modifiées : aucune.
8. Compatibilité legacy : publication byte-identique pour données valides (le sanitizer ne
   retire que le malformé) ; vitest 155/155 + `tsc` + build + lint 0 erreur.
9. Tests créés : réutilisés (`sanitizeSections.test.ts` P07 — garde-fous + types inconnus).
10. Tests exécutés : suite verte. Injection neutralisée au niveau unitaire : payload malformé
    écarté à l'écriture comme au rendu ; types inconnus ignorés, jamais exécutés (pas de
    `<script>`/JS arbitraire possible : configs typées + composants contrôlés + échappement React).
11. Résultats : tous verts. Audit : DnD reorder, viewports desktop/tablette/mobile en iframe,
    undo/redo, brouillon/publié + historique rollback, limites de plan serveur (`enforce_*`),
    uploads durcis (`0029` : 5 Mio + MIME whitelist + SVG exclu côté serveur ; compression
    client `compressImageFile`).
12. Risques restants / reportés : responsive fin par section et couche Effects → polish P15 ;
    E2E éditer→publier → P16 (infra inexistante).
13. Fichiers modifiés : `src/pages/admin/StoreBuilderPage.tsx` (sanitize à la publication) +
    `docs/refonte/`.
14. Prochaine phase recommandée : PHASE-10 (Billing + Entitlements — inclut la dérive plans).
