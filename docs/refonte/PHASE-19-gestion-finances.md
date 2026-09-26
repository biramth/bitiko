# PHASE 19 — Outils de gestion : finances simples et bilan

> État : 🟨 EN COURS — 2026-09-26 (code prêt ; **migrations 0129 et 0130 appliquées sur dev** le 2026-09-26, prod non touchée).

## Objectif

Donner au commerçant un vrai outil de pilotage, simple et monétisable : voir ce qu'il gagne, ce qu'il dépense, ce qu'il lui reste,
et télécharger un bilan. Pas une comptabilité légale : un **bilan de gestion** lisible par quelqu'un qui n'a jamais fait de compta.

## Ce qui est livré

**Écrans** (`/admin/gestion`, menu « Finances », réservé propriétaire et managers) :
- **Bilan** : période (mois, mois dernier, trimestre, année) ; recettes / dépenses / bénéfice (ou perte) avec marge ; barres mois par mois ;
  « D'où vient l'argent » ; « Où part l'argent » (par catégorie, avec parts) ; « Ce qui rapporte le plus » (produits et prestations).
- **Journal** : dépenses et recettes saisies mois par mois, ajout en 6 champs, modification, suppression, filtre, totaux.
- **Bilan imprimable** (`/admin/gestion/bilan?periode=…`, hors menu) : une page A4 sobre à « Enregistrer en PDF » depuis l'impression du
  navigateur — aucune bibliothèque PDF.
- **Exports** : journal et bilan en CSV compatible Excel (séparateur `;`, BOM UTF-8, dates françaises, protection contre l'injection de formules).

**Recettes automatiques** (aucune ressaisie) : commandes **payées ou livrées** (annulées et en attente exclues) + rendez-vous **terminés**
au prix figé à la prise (0122). Les ventes hors ligne et toutes les dépenses se saisissent dans le journal.

**Base de données** (`0130_finance_tools.sql`) : table `finance_entries` (RLS propriétaire/manager), RPC `finance_revenue_by_month` et
`finance_top_items` (contrôle d'accès dans la fonction, période ≤ 800 jours), plafond de saisies du plan gratuit appliqué par trigger.

## Modèle payant (à valider commercialement)

| | Découverte (gratuit) | Essentiel | Pro |
|---|---|---|---|
| Bilan | mois en cours | 12 mois, trimestre, année | historique complet |
| Journal | 30 saisies / mois | illimité | illimité |
| Export CSV (Excel) | ✅ | ✅ | ✅ |
| Bilan PDF imprimable | ✅ (mention « Généré avec Bitiko ») | ✅ (idem) | ✅ sans mention Bitiko |
| Comparaison avec la période précédente | — | — | ✅ |

**Décision (2026-09-26)** : CSV et PDF sont générés dans le navigateur du commerçant, donc sans coût serveur : ouverts à tous les plans
(ils servent aussi de vitrine à Bitiko, via la mention en pied de page du gratuit et de l'Essentiel).
Le gratuit donne une vraie valeur (résultat du mois, export, PDF) pour créer l'habitude ; le besoin de **l'historique**, de la **comparaison**
et des **saisies illimitées** pousse vers Essentiel puis Pro. Réglages : `plans.ts` (`financeHistoryMonths`,
`financeExport`, `financeComparison`, `maxMonthlyFinanceEntries`) et `plan_limits` (`MAX_MONTHLY_FINANCE_ENTRIES`).
Limite assumée : seule la limite de saisies est imposée côté base ; l'historique et la comparaison sont des restrictions d'interface
(les données restent celles du commerçant).

## Tests

`src/features/finance/finance.test.ts` (périodes, bilan, CSV, catégories), `src/db/bookingMigrations.test.ts` (plafond, validations, recettes
automatiques, prix figé, classement, refus des invités / périodes invalides), `plans.test.ts`.

## Pistes suivantes (non faites)

Pièce jointe (photo du reçu), dépenses récurrentes (loyer chaque mois), objectifs et alertes (« dépenses > 80 % des recettes »),
TVA / fiscalité par pays, export comptable normalisé (SYSCOHADA), relance des factures clients impayées, envoi du bilan par email au comptable.
