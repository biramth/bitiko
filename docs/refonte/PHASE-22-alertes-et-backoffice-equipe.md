# PHASE 22 — Alertes marchand et back-office équipe Bitiko

> État : 🟨 EN COURS — 2026-09-26 (0131 à 0133 appliquées sur dev le 2026-09-26, prod non touchée).

## Alertes marchand (0131)

Avant : un client qui commandait sans cliquer sur « envoyer sur WhatsApp » n'était jamais signalé au commerçant avant le cron quotidien ; les emails de commande n'existaient qu'en option cachée ; rien pour le stock.

- **Email d'alerte par défaut** (le marchand le désactive, il ne l'active pas) pour : nouvelle commande, stock bas, rupture. `resolveRules` (api/_lib/automationDispatch.ts) ajoute la règle par défaut si le marchand n'a aucune règle email pour l'événement ; une règle désactivée = refus explicite.
- **Événements de stock** `STOCK_LOW` / `STOCK_OUT` (trigger sur `products.stock`), émis uniquement au franchissement du seuil (`shops.low_stock_threshold`), jamais à chaque vente.
- **ORDER_CREATED enrichi** (client, téléphone, paiement) ; montant formaté dans la devise de la boutique.
- **Déclenchement immédiat** après création de commande (`kickAutomations`), le cron reste le filet.
- Emails habillés Bitiko (`merchantAlertEmailHtml`, tout échappé). Page Notifications : commandes + stock, activées par défaut.

## Back-office équipe (0132)

Constats : liste des boutiques sans recherche ni filtre ni pagination ; plan affiché « Pro » même échu ; aucune vue des revenus ni des renouvellements ; pas de geste commercial ; journal d'audit illisible (et `template_save` refusé par la base).

- **Boutiques** : recherche (nom, lien, email, WhatsApp), filtres plan / échéance / activité / pays, tri, pagination, dernière commande, plan **effectif**.
- **Abonnements** (page Paiements) : revenu mensuel récurrent, répartition des plans, à renouveler sous 7 jours, échus depuis moins de 30 jours, relance WhatsApp pré-rédigée.
- **Offrir / prolonger** un abonnement (`/api/admin/grant-subscription`) : motif obligatoire, tracé dans le journal *avant* l'écriture, jamais de rétrogradation d'un plan supérieur actif.
- **Journal** (`/plateforme/journal`, propriétaires et administrateurs) : qui a fait quoi, filtrable.
- Correction : `admin_audit_log` accepte `template_save` et `subscription_grant`.

## Suspension, santé technique, fiche produit (0133)

- **Suspension d'une boutique** : `shops.suspended_at`. Vitrine « momentanément indisponible » (`ShopSuspendedPage`), et **plus aucune commande, rendez-vous ni réservation** possible : trigger côté base sur `orders`, `appointments`, `reservations` (les RPC `SECURITY DEFINER` y insèrent aussi). Données intactes, réactivation immédiate. Bandeau rouge dans l'admin du commerçant. Action réservée aux propriétaires/administrateurs (`suspend_shops`), motif obligatoire, tracé dans le journal *avant* l'écriture ; le motif n'est jamais lisible publiquement. Filtre « Suspendues » sur la page Boutiques.
- **Santé technique** (`/plateforme/sante`, propriétaires, administrateurs, développeurs) : `get_platform_health()` → événements non traités depuis > 15 min (cron ou clé d'emails en panne), envois d'alerte en échec et ignorés, campagnes en échec, preuves de paiement en attente depuis > 24 h, derniers échecs avec leur erreur. Niveaux ok / à surveiller / action requise (`healthChecks`, testé).
- **Fiche produit** : 1 436 → 907 lignes. Extraits : `productFormParts` (cartes, interrupteur, aperçu), `OptionFieldsEditor`, `VariantsEditor`, `productFormHelpers`. Cartes avancées (variantes, champs de précision) repliées tant qu'elles sont vides ; barre d'enregistrement collante (mobile et bureau).

## À faire

- Vérifier un email de commande réel sur la preview (dev) ; appliquer 0131 puis 0132 sur prod après validation.
- Santé : journaliser l'exécution des crons (aujourd'hui déduite des événements en attente), suivi des emails rebondis côté Resend.
- Alertes marchand par WhatsApp (canal non branché) ; digest quotidien.
- Notes internes sur un compte, funnel d'inscription (inscrit → produit → première commande), suspension automatique (impayé grave), email au commerçant suspendu.
