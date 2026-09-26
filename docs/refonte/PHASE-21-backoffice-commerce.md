# PHASE 21 — Back-office commerçant (côté commerce)

> État : 🟨 EN COURS — 2026-09-26. Objectifs retenus : simplicité d'usage, fonctionnalités manquantes, fiabilité et sécurité.

## Audit (2026-09-26)

Passage en revue de l'admin d'une boutique fictive (bureau et mobile) : dashboard, commandes, détail commande, produits, clients, réglages.

- Dashboard commerce : l'action attendue (commandes à confirmer, stock en rupture) était noyée sous une checklist et des tuiles ; le stock ne listait aucun produit.
- Détail commande : tableau des articles illisible sur mobile, message WhatsApp générique (« ##0048 » doublé), pas de bon de commande imprimable.
- Commandes : pas d'export.
- Rôles : le vendeur voyait Personnaliser, Paramètres et les boutons d'écriture du catalogue (RLS refusait ensuite) ; un lien direct ouvrait n'importe quelle page.

## Livré

- **Dashboard commerce** (`features/dashboard/CommerceDashboard.tsx`) : « Commandes à traiter » (à confirmer d'abord, action en un clic), « Stock à surveiller » (produits nommés, ruptures), KPI homogènes, top produits ou appel à l'offre Essentiel ; la checklist passe après dès la première commande.
- **Détail commande** : disposition en deux colonnes (mobile : étape d'abord), articles en liste, boutons Appeler / WhatsApp, message WhatsApp pré-rempli **selon l'étape** (`utils/orderMessages.ts`), date relative.
- **Bon de commande imprimable** (`/admin/commandes/:id/imprimer`) : A4 sobre, PDF via l'impression du navigateur, mention Bitiko selon le plan.
- **Export Excel des commandes** (CSV `;` + BOM, formules neutralisées), tous statuts ou filtre courant, jusqu'à 5 000 lignes.
- **Droits par rôle** (`features/shop-settings/permissions.ts` + `RequireArea`) : menus, routes et boutons d'écriture alignés sur owner / manager / vendeur ; RLS reste la barrière serveur.

## À faire

- Notifications marchand : alerte email/WhatsApp de nouvelle commande et de stock bas (règles d'automatisation existantes à étendre).
- Fiche produit : long formulaire (1 400 lignes) à découper en sections repliables et à tester sur mobile.
- Clients : historique des commandes par client, notes, segments.
- Commandes : filtre par période, recherche par produit, paiement partiel / encaissement.
- Fiabilité : tests PGlite du flux commande (stock, annulation, transitions), test des gardes de route, journal d'activité de l'équipe.
