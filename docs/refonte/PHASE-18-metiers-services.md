# PHASE 18 — Métiers, services et réservations (chantier post-refonte)

> État : 🟨 EN COURS — 2026-09-26 (DEV, code prêt, **migrations 0121 → 0128 non appliquées** sur la base dev, prod non touchée).
> Origine : audit du 2026-09-26 sur le chantier « 10 groupes métiers + services + gabarits » (commits `a491480` → `b63b7c9`, migrations 0112–0120), resté hors `PLAN.md`.

## Objectif

Clôturer le chantier métiers/services : réservations réellement utilisables par les visiteurs, intégrité des données
(prix, équipe, abonnements) et suppression des incohérences relevées à l'audit. Aucune migration n'est poussée
automatiquement : elles s'appliquent **par environnement** (`npx supabase db push --project-ref <dev|prod>`), dev d'abord.

## Ordre de déploiement (important)

1. Appliquer `0121 → 0128` sur **dev**, puis déployer la preview `develop`.
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

### 18.5 — Suite : plafonds, catégories, notifications, multi-pays (`0125` → `0128`)
- **`0125` plafonds de plan** (valeurs de départ à valider, modifiables par `UPDATE plan_limits` sans migration) :
  prestations actives free 6 / essentiel 30 / pro ∞ ; équipiers actifs 2 / 8 / ∞ ; demandes en ligne par mois 40 / 300 / ∞
  (invités seulement : le personnel saisit toujours à la main). Triggers serveur, jauge `PlanLimitBanner`, bouton d'ajout
  désactivé au plafond, messages d'erreur `plan_limit_exceeded`. Modifier une ligne déjà active n'est jamais bloqué.
- **`0126` catégories** : `categories.kind` (`product` | `service`), backfill, garde-fou à l'attache ; création de catégories de
  prestation depuis le formulaire de prestation. Les catégories partagées existantes restent `product`.
- **`0127` + Notifications** : le propriétaire crée ses règles email (`/admin/parametres/notifications`, RLS owner write, une règle par
  événement/canal, ≤ 30 règles, gabarit borné, canaux non branchés refusés). Le dispatcher est partagé
  (`api/_lib/automationDispatch.ts`) et déclenché **tout de suite** après commande / changement de statut / réservation
  (`/api/automation-kick`, sans attendre le cron quotidien).
- **`0128` multi-pays** : `normalize_phone(numéro, pays)` (SN, CI, ML, BF, BJ, TG, NE, GN, NG, GH) ; triggers commandes / WhatsApp
  boutique / profils migrés ; pays et fuseau par boutique dans `booking_settings.country_code` (carte « Horaires de réservation »).
  Miroir front : `src/config/countries.ts` + `src/utils/phone.ts`. Limite : les numéros sont multi-pays, mais les textes
  (« Sénégal », message d'erreur SN) et les gabarits restent francophones.

### 18.6 — Hygiène
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

Prod est en retard de **0098 → 0128**. Avant la bascule, rejouer la chaîne sur un clone de la base prod, en particulier :
`0104` (`drop table if exists plans, country_prices cascade`), `0113` (suppression d'un type métier), `0119`/`0120` (paire qui
s'annule, résultat net idempotent). Numérotation : aucun fichier `0067`–`0085` dans le dépôt — vérifier que dev/prod n'ont pas de
schéma appliqué hors dépôt.

## Historique de migrations : état constaté (CLI Supabase, lecture seule, 2026-09-26)

- **Dev** (`tlqgcmbdethmhqrablcy`) : historique numérique complet `0001 → 0120`, **avec le même trou 0067–0085**. Dev a donc été
  construit uniquement à partir des fichiers du dépôt : le trou ne masque aucun schéma nécessaire (aucun fichier de cette plage n'apparaît
  dans l'historique git : rien n'a été supprimé, la numérotation a simplement sauté).
- **Prod** (`jebmorovxoxecgixievu`) : historique **mixte**. 68 versions horodatées (`20260914… → 20260924…`, appliquées hors
  fichiers du dépôt — éditeur SQL / outil de migration) + seulement `0061–0066` et `0086–0088` en numérique ; `0001–0060` et
  `0089–0097` n'y sont pas enregistrées (leur schéma a pu être appliqué sous forme horodatée : non vérifié).
  Conséquence : **`supabase db push` vers la prod échoue** (`LegacyDbPushMissingLocalError`, versions distantes absentes du dépôt) et il faut
  **réconcilier l'historique** avant toute bascule (`supabase migration repair` + vérification du schéma réel), pas seulement rejouer 0098–0128.
- Non fait : comparaison du schéma réel de prod avec celui de dev (l'accès en lecture au schéma de prod n'a pas été autorisé
  dans cette session). À faire par le propriétaire du projet : `supabase db dump --linked --schema public` de prod puis diff avec dev,
  ou clone de prod sur une branche Supabase, avant de rejouer la chaîne.

## Décisions produit encore ouvertes

- Valeurs finales des plafonds de plan 0125 (proposition de départ, pas une décision).
- Un plan « Business » / prix (`plans.ts` reste la source des prix ; `plan_entitlements` non lu par l'app).
- Multi-pays : gabarits, textes et devise par pays (seuls téléphones et fuseau sont couverts).
