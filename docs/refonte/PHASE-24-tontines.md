# PHASE 24 — Tontine commerciale et notes

> État : 🟨 EN COURS — 2026-10-01 (code prêt ; **migrations 0156 → 0159 appliquées sur dev et prod** le 2026-10-01).

## Objectif

Les clients épargnent auprès de la boutique pour une occasion (Tabaski, rentrée, fêtes) par petits versements réguliers, puis
reçoivent leur marchandise à la date de remise. Le commerçant tient aujourd'hui ce carnet sur papier : Bitiko le remplace côté
dashboard, **en saisie manuelle uniquement**. Bitiko ne reçoit, ne garde ni ne reverse aucun argent : c'est un registre.

## Ce qui est livré

**Écrans** (`/admin/tontines`, menu « Gestion », mêmes accès que Finances : propriétaire et managers, jamais le vendeur) :
- **Liste** : une carte par tontine (date de remise et compte à rebours, membres, remis, montant en caisse) et le total de l'épargne
  des clients en caisse, rappelé comme **non compté dans les recettes**.
- **Tontine** : chiffres clés (en caisse, total versé, membres, retards en nombre et en montant) ; membres filtrables (en retard,
  à jour, objectif atteint, remis) avec recherche ; bouton « Encaisser » sur chaque ligne ; onglet des derniers versements.
- **Encaissement** : montant prérempli (versement du membre), raccourcis (2 versements, rattraper le retard, tout le reste), mode
  de paiement en un geste, puis **reçu WhatsApp** prêt à envoyer depuis le WhatsApp du commerçant (lien `wa.me`, coût nul).
- **Fiche membre** : progression, historique, relance WhatsApp si en retard, annulation motivée d'un versement, remise, annulation
  de la remise, retrait (seulement sans versement).
- **Remise** : en marchandise ou en argent (désistement) ; le montant est l'épargne calculée par la base. Une remise en marchandise
  peut être **comptée en recette dans Finances** (catégorie « Remises de tontine »), retirée si la remise est annulée.
- **Exports CSV** : carnet des membres, historique complet des versements (annulations et motifs compris).

**Calcul du retard** (`src/features/tontine/schedule.ts`) : échéances depuis l'inscription du membre (jamais avant l'ouverture)
jusqu'à aujourd'hui ou la remise, au rythme de la tontine (jour, semaine, mois ; le 31 devient le dernier jour des mois courts),
multipliées par le versement du membre et plafonnées à son objectif. L'objectif proposé à l'inscription suit la même règle.

**Base de données** (`0156_tontines.sql`) :
- `tontines`, `tontine_members`, `tontine_contributions`, RLS propriétaire/manager ;
- boutique et tontine **déduites par trigger** (une saisie ne peut pas viser une autre boutique) ; téléphone normalisé selon le pays ;
- versements **jamais modifiés ni supprimés** (aucun droit UPDATE/DELETE) : annulation par `cancel_tontine_contribution` avec motif ;
- remise uniquement par `settle_tontine_member` / `reopen_tontine_member` (droits UPDATE par colonne sur les membres) ;
- clôture refusée tant qu'un membre non remis a de l'épargne ; plus de versement ni d'inscription sur une tontine close ou un membre remis ;
- tontine ou membre ayant des versements : suppression refusée (il faut clôturer) ;
- `tontine_summaries` et `tontine_member_balances` évitent de charger tous les versements.

## Notes (`/admin/notes`, menu « Gestion »)

- **Mes notes** : bloc-notes libre (`shop_notes`, 0157) — saisie rapide, titre facultatif, couleur, épinglage, recherche sans
  accents, modification et suppression. Propriétaire et managers seulement (une note peut contenir des prix d'achat).
- **Toutes les notes** : le bloc-notes plus toutes les notes laissées sur les fiches, regroupées par la fonction
  `shop_notes_feed` (0158, corrigée par 0159 : `reservations` n'a pas de `updated_at` en prod) : note interne des commandes, journal des finances, tontines (tontine, membre, versement, remise,
  motif d'annulation), rendez-vous et réservations (colonnes prêtes, aucun écran ne les remplit encore). Filtre par origine,
  recherche, lien « Ouvrir la fiche » (une note de membre ouvre directement sa fiche via `?membre=`). Lecture seule : chaque note
  se modifie sur sa fiche d'origine. Pas de plafond par plan.

## Modèle payant (PROPOSITION à valider)

| | Découverte | Essentiel | Pro |
|---|---|---|---|
| Tontines en cours | 1 | 3 | illimité |
| Membres par tontine | 20 | 100 | illimité |

Appliqué côté base (`plan_limits` : `MAX_ACTIVE_TONTINES`, `MAX_TONTINE_MEMBERS`) et reflété dans `plans.ts`.

## Points d'attention

- **Réglementaire** : la collecte d'épargne est encadrée dans l'UEMOA. Bitiko reste un outil de suivi et ne doit jamais faire
  transiter ces fonds (pas de paiement Wave vers Bitiko pour ce module). À faire valider par un juriste avant toute communication.
- L'épargne n'est pas une recette : elle n'apparaît pas dans le bilan, sauf la remise en marchandise si le commerçant le choisit.

## Tests

`src/db/tontineMigrations.test.ts` (PGlite : droits par rôle et par boutique, plafonds, versements immuables, annulation, remise
et recette, clôture, suppressions), `src/features/tontine/tontine.test.ts` (échéances, retard, objectif, messages, CSV), `src/db/shopNotesMigration.test.ts`,
`src/db/notesFeed.test.ts`, `src/features/notes/notes.test.ts` (recherche, liens et libellés des notes).

## Pistes suivantes (non faites)

Fiche imprimable du membre (carnet papier), rappels WhatsApp automatiques via l'API (à arbitrer avec la règle « numéro Bitiko →
clients seulement »), lien vers la fiche client du CRM, pénalités de retard, suivi en ligne de son épargne par le client,
transformation de la remise en commande (stock décrémenté).
