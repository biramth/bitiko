# PHASE 18 — Métiers, services et réservations (chantier post-refonte)

> État : 🟨 EN COURS — 2026-09-26 (DEV, code prêt, **migrations 0121 → 0124 non appliquées** sur la base dev, prod non touchée).
> Origine : audit du 2026-09-26 sur le chantier « 10 groupes métiers + services + gabarits » (commits `a491480` → `b63b7c9`, migrations 0112–0120), resté hors `PLAN.md`.

## Objectif

Clôturer le chantier métiers/services : réservations réellement utilisables par les visiteurs, intégrité des données
(prix, équipe, abonnements) et suppression des incohérences relevées à l'audit. Aucune migration n'est poussée
automatiquement : elles s'appliquent **par environnement** (`npx supabase db push --project-ref <dev|prod>`), dev d'abord.

## Ordre de déploiement (important)

1. Appliquer `0121 → 0124` sur **dev**, puis déployer la preview `develop`.
   Le code lit `team_members_public`, `booking_settings`, `get_booking_slots`, `get_reservation_slots` et appelle
   `create_appointment` à 6 arguments : le front déployé **avant** les migrations casse l'équipe vitrine et la réservation.
2. Recette dev (voir « Recette » ci-dessous), puis prod.

## Livrables par phase

### 18.1 — Correctifs front rapides
- Prix des prestations en **unités entières** (comme `products`) : `ServicesPage`, `ServiceCard`, `MenuSection`
  (qui divisait aussi les prix produits par 100), dashboard et agenda. Migration `0121` ramène les lignes existantes.
- Route publique `/prestations` (+ `catalogHref` du vocabulaire : lien catalogue = `/prestations` pour un métier sans produits,
  middleware OG et sitemap).
- Visite guidée : étapes filtrées par capability ; les groupes d'accordéon sont dépliés pendant la visite.
- Workspace : plus de clignotement au chargement des capabilities ; un type inconnu/déprécié ne vide plus le workspace
  (`fetchShopCapabilities`, fail-open).
- Dashboard : rendez-vous/réservations annulés non comptés ; dates locales (`localDateIso`) au lieu d'UTC.
- Sidebar repliée : plus de `<a>` dans un `<button>`.
- Crons : `CRON_SECRET` obligatoire (fail-closed, comparaison en temps constant) — `api/_lib/cronAuth.ts`.
- Vie privée : `team_members` n'est plus lisible en public ; la vitrine lit `team_members_public`
  (téléphone/email seulement si `show_contact`).

### 18.2 — Réservation réelle (`0122`)
- `booking_settings` (horaires, jours, pas, horizon, capacité de tables) — publics en lecture, écriture owner/manager,
  UI « Horaires de réservation » sur Rendez-vous et Réservations.
- `create_appointment` : durée = celle de la prestation (serveur), horaires/horizon vérifiés, capacité = équipiers actifs,
  verrou transactionnel par boutique, téléphone normalisé, anti-spam (3 réservations à venir par numéro, 30/min par boutique),
  copie nom/prix/durée de la prestation sur le rendez-vous. Le personnel peut saisir un rendez-vous passé.
- `create_reservation` : mêmes garde-fous + capacité de couverts.
- `get_booking_slots` / `get_reservation_slots` : disponibilités publiques sans donnée client.
- Vitrine : sections `appointments` / `reservations` réécrites (créneaux réels, formulaire, confirmation) ; désactivées dans l'aperçu du builder.

### 18.3 — Facturation et intégrité (`0123`, migrations 0112/0113)
- `settlePayment` : prise en charge atomique (webhook + retour Wave simultanés), montant/devise vérifiés contre la session,
  période **prolongée** au renouvellement anticipé (`nextSubscription`, partagé avec l'approbation manuelle),
  rétrogradation payante refusée au checkout et masquée dans l'UI.
- Miroir `subscriptions` / `subscription_history` alimenté par trigger depuis `shop_subscriptions`.
- `0112` : plus de `DISABLE ROW LEVEL SECURITY` temporaire. `0113` : re-pointe les boutiques avant de supprimer `food_services`
  (FK `RESTRICT`).

### 18.4 — Notifications (`0124`)
- Email au commerçant à chaque demande (`/api/booking-notify` → `api/onboarding.ts?action=booking-notify`, une seule fois par demande,
  dans les 10 min suivant sa création).
- Événements `APPOINTMENT_CREATED` / `RESERVATION_CREATED` dans `business_events` ; `automation-dispatch` planifié (quotidien).

### 18.5 — Hygiène
- Tests : `src/db/bookingMigrations.test.ts` (PGlite, vrai Postgres en mémoire), `api/_lib/{cronAuth,subscriptionPeriod,bookingEmail}.test.ts`.
- `test-results/` retiré du suivi git ; README/AGENTS alignés.

## Recette dev avant prod

- [ ] `db push` dev : 0121 → 0124 sans erreur.
- [ ] Vitrine salon : prendre un rendez-vous invité, vérifier l'email au commerçant et le créneau grisé pour le suivant.
- [ ] Vitrine restaurant : réserver une table, dépasser la capacité.
- [ ] Admin : modifier les horaires, saisir un rendez-vous passé.
- [ ] Paiement Wave test : renouvellement anticipé (fin de période = ancienne fin + 30 j).
- [ ] Une boutique avec `business_type = 'food_services'` (si elle existe) retombe sur Restauration après 0113.

## Prod (PHASE-17) — points de vigilance

Prod est en retard de **0098 → 0124**. Avant la bascule, rejouer la chaîne sur un clone de la base prod, en particulier :
`0104` (`drop table if exists plans, country_prices cascade`), `0113` (suppression d'un type métier), `0119`/`0120` (paire qui
s'annule, résultat net idempotent). Numérotation : aucun fichier `0067`–`0085` dans le dépôt — vérifier que dev/prod n'ont pas de
schéma appliqué hors dépôt.

## Décisions produit ouvertes (non tranchées, rien d'implémenté)

- Plafonds de plan pour prestations / équipe / rendez-vous (aujourd'hui seuls les produits sont plafonnés : un salon n'a pas de levier payant).
- Catégories : les prestations partagent `categories` avec les produits.
- Interface marchand pour créer des règles d'automatisation (le moteur tourne, les règles ne se créent que par SQL).
- Multi-pays : `normalize_sn_phone` et le fuseau `Africa/Dakar` par défaut restent sénégalais.
- `plan_entitlements` et les prix (`plans.ts`) restent dupliqués côté code.
