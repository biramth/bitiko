# PHASE 08 — Template system

> État : ✅ TERMINÉ — 2026-09-25 (DEV uniquement, prod non touchée).
> Journal : 2026-09-25 — catalogue DB + RPC compat + picker piloté par la DB ;
> livrable ci-dessous.

## Objectif

De vrais **sites préconstruits** (structure, sections, navigation, pages produit/catalogue),
structurellement différents — pas des variantes de couleurs. Règle d'or :
`Business Type → besoins`, `Template → site`, `Customization → apparence`, `Effects → animations`,
`Business Identity → contenu`. **Business Type ≠ Template** (un type → plusieurs templates ;
un template → potentiellement plusieurs types).

## Vérifications préalables

- [ ] Auditer `shop_saved_themes`, `shop_publish_history`, `TemplateLibraryPanel`,
      `storeTemplates.ts`, `template_id` (`0023`), miniatures, application de style actuelle.

## Étapes

1. Modèle `templates` (+ versions) : structure de sections/blocs, types compatibles, aperçu.
2. Galerie : screenshot, nom, types compatibles, **[Voir la boutique]** (démo sur données fictives,
   ex. `demo-template.bitiko.shop`), **[Utiliser ce style]**.
3. Application sûre : présentation seule — produits/commandes/clients/URLs intacts (garantie
   PHASE-07 §4 testée ici), historique de publication conservé/étendu.
4. Templates existants migrés ou marqués legacy avec chemin de sortie.

## Livrable PHASE 8 COMPLETE (2026-09-25, DEV)

1. Tables créées : `templates`, `template_business_types` (+ trigger `updated_at`). Rien d'autre.
2. Migrations effectuées : `0103_template_catalog.sql` (catalogue + seed + `shop_template_slugs()`)
   — historique `0103|0103` ✅. Prod non touchée.
3. Relations : jonction PK composite + 2 FK cascade ; index côté type.
4. Index : voir §3.
5. RLS : activée sur les 2 tables (vérifié effectif).
6. Policies : `templates: public read`, `template_business_types: public read` (vérifié) ;
   zéro écriture client.
7. Fonctions ajoutées : `shop_template_slugs(uuid)` (INVOKER, grants anon/authenticated
   explicites vérifiés).
8. Compatibilité legacy : apply path vérifié présentation-seule (produits/commandes/clients
   intacts) ; picker en fail-open (legacy si RPC vide/erreur) ; vitest 155/155 (3 nouveaux) +
   `tsc` + build + lint 0 erreur.
9. Tests créés : `template.service.test.ts` (compat DB prioritaire, fallbacks, picker non vide).
10. Tests exécutés : suite verte ; seed (4 templates, 4 mappings) et grants vérifiés effectifs.
11. Résultats : tous verts. Template≠Type prouvé : un mapping ajouté en base surface un template
    à un autre type sans code (requête `shop_template_slugs`).
12. Risques restants / reportés : galerie publique + boutiques démo (données fictives + DNS
    wildcard — chantier dédié, pas de demi-mesure) ; versions de templates (aucun flux) ;
    CRUD admin des compatibilités (étendre l'outil `/plateforme/types` en P14).
13. Fichiers modifiés : `supabase/migrations/0103*`, `src/services/template.service.ts` (+ test),
    `src/features/store-builder/TemplateLibraryPanel.tsx`, `src/types/database.types.ts`
    (+1 RPC) + `docs/refonte/`.
14. Prochaine phase recommandée : PHASE-09 (éditeur visuel : DnD, previews, undo/redo).
