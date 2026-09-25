# PHASE 08 — Template system

> État : ⬜ NON DÉMARRÉ
> Journal : —
> Pré-requis : PHASE-07 ✅.

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

## Critères de sortie

- [ ] Appliquer un template ne détruit aucune donnée (tests + fumée), démo consultable.
- [ ] `PHASE 8 COMPLETE` rédigé.
