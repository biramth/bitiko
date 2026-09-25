# PHASE-03 — Dossier de design (validation requise AVANT toute migration)

> Statut : 🟨 DESIGN EN VALIDATION — **aucune migration exécutée, aucun schéma modifié.**
> Ce document répond aux points A/B/C/D exigés avant la PHASE-03. La migration ne part
> qu'après ta validation explicite de ce dossier.

## A. Modèle actuel (vérifié, pas supposé)

### A.1 Tables liées à `shop` — tout mène à `shops`

| Table | Clé shop | RLS (effectif) | Rôle |
|---|---|---|---|
| `shops` | racine (`owner_id` → profiles) | public read intégral ; owner insert/update/delete ; manager update (⚠️ sans WITH CHECK) | Business + vitrine fusionnés |
| `categories`, `products`, `delivery_secteurs`, `delivery_villes`, `pages` | `shop_id` direct | public read (partiel) ; owner + manager write | Catalogue / vitrine / livraison |
| `product_images`, `product_variants` | via `products` | read with product ; owner + manager write | Catalogue |
| `orders`, `shop_subscriptions`, `wave_payments`, `shop_members`, `customers`, `shop_saved_themes`, `shop_publish_history`, `promo_redemptions` | `shop_id` direct | owner read (+ team read orders) ; **zéro** write client pour billing/members-claim encadré | Ventes / billing / équipe / clients |
| `order_items` | via `orders` | owner + team + customer-self read | Ventes |
| `promo_codes` | **globale** (code unique) | verrouillée (service-role) | Billing |
| `page_views` | `shop_id` nullable (vues plateforme aussi) | anon/authenticated insert ; owner select | Analytics |
| `platform_members`, `campaigns`, `campaign_sends`, `admin_audit_log`, `check_email_attempts` | hors shop | verrouillées (service-role) | Platform / support |

Fonctions structurantes : `create_order` (seule écriture commandes, invitée incluse),
`set_order_status` / `set_order_delivery_fee` (transitions + équipe), `effective_plan_key` +
`enforce_*`/`plan_max_*` (limites serveur), `shop_role()` + `claim_shop_invites` (équipe),
`redeem_promo_code`/`get_promo_offer` (promos), `get_platform_*` (gated `is_platform_admin`).

### A.2 Colonnes `shops` — quoi appartient à l'activité vs au shop

| Colonne | Destination cible | Motif |
|---|---|---|
| `owner_id` | → membership d'organization (PHASE-04) | 1 user = N activités, rôles par activité |
| `business_type` (TEXT), `onboarding_responses` | → `business_type_id` sur activity (PHASE-04/05) | Contexte métier de l'**activité**, pas de la vitrine |
| `name`, `whatsapp_number`, `address`, `currency` | → activity (le shop hérite par défaut) | Identité pro partagée entre établissements |
| `payment_instructions` | → activity (+ override shop plus tard) ; **sortir de la lecture publique** (D2.6) | Encaissement de l'activité |
| `slug`, `template_id`, `layout_sections`, `theme_config`, `builder_draft`, `page_templates`, `theme_color`, `banner_url`, `logo_url` | **restent au shop** | Vitrine / URL / design = le morceau commerce |
| `delivery_fee`, `free_delivery_threshold`, `low_stock_threshold`, `ga_measurement_id` | restent au shop | Paramètres de l'établissement |
| `description`, `social_links` | restent au shop (vitrine), copiables depuis l'activity | Contenu public |
| `custom_domain` | **supprimé en 0019** — à reconstruire proprement (PHASE-10+, à partir d'Essentiel) | Ne pas ressusciter l'ancien modèle |

### A.3 Dépendances qui interdisent toute migration brutale

- **URLs/storefront** : `slug` unique (check format) résolu via `src/lib/tenant.ts` + `middleware.ts`
  (`<slug>.bitiko.shop`) ; `sitemap.ts`/`og.ts` lisent `shops`. Toute contrainte sur `slug` reste.
- **API** (11 fichiers touchent `shop_id`) : `billing/*`, `admin/*`, `account.ts` (preuves, suppression
  compte), `onboarding.ts` (vérifie `owner_id` avant l'email de bienvenue), `cron/renewal-reminders`.
- **Frontend** : 18 services (`shop.service`, `order.service`, `billing.service`…), garde `RequireShop`,
  `TenantContext`, 21 fichiers avec `shop_id` ; onboarding (`OnboardingPage`) et `SettingsPage`
  écrivent `business_type`.
- **Abonnements** : `shop_subscriptions` PK `shop_id`, `effective_plan_key` (expiré → free), prix et
  limites dupliqués `plans.ts` ↔ DB (**dérive active** : free 15 vs 8 — voir PHASE-01 §3).
- **Analytics** : `page_views(shop_id)`, `get_shop_visit_stats(shop_id)`, compteurs dénormalisés
  (`customers` via triggers `sync_customer_on_order`).

## B. Modèle cible proposé (progressif, sans big bang)

```text
USER ── MEMBERSHIP (rôle) ──→ ACTIVITY / BUSINESS ── WORKSPACE (adapté au type)
                                  │  business_type_id → BUSINESS TYPES → CAPABILITIES
                                  ├── TEAM (membres, rôles granulaires serveur)
                                  ├── CUSTOMERS (partagés entre établissements)
                                  ├── SUBSCRIPTION → PLAN → ENTITLEMENTS (PHASE-10)
                                  ├── APPOINTMENTS / SERVICES / … (futur, selon capabilities)
                                  └── SHOPS (0..N, le morceau commerce)
                                        └── FRONTSTORE ADAPTATIF (template orthogonal)
```

### Règle d'or (répond au §5 : SHOP ne devient jamais le tenant principal)

- Les **nouvelles tables métier sont cléées `activity_id`**, jamais `shop_id` en racine.
- Les **référentiels** (`business_types`, `capabilities`, jonction) n'ont **aucune clé tenant** :
  lecture publique, écriture platform-only (même pattern éprouvé que `platform_members`).
- `shops` garde son rôle et ses RLS ; `shops.activity_id` (PHASE-04, nullable + backfill 1:1)
  est le seul pont, ajouté sans toucher aux policies existantes.

### Trajectoire par phase (résumé opposable)

P03 fondations (ce dossier) → P04 activities+membres+lien → P05 activation types/capabilities +
compat `business_type` → P06 workspace généré → P07 frontstore adaptatif (même moteur, sections
pilotées par capabilities : coiffeur = services/tarifs/rdv/équipe/galerie/horaires **sans panier
obligatoire** ; boutique = catalogue/panier/commande inchangés) → P08 templates orthogonaux →
P10 abonnements au niveau activity → P11 Wave en provider TEMPORARY → P14 admin des référentiels.

### Business Type = source de contexte (ni étiquette, ni filtre nav, ni template)

`business_types` porte `slug` stable + `metadata` jsonb (paramètres métier futurs : durées,
unités, champs spécifiques — exploités à partir de P05, jamais de `if type ===` en dur).
Les capabilities (`HAS_SHOP`, `HAS_PRODUCTS`, `HAS_APPOINTMENTS`, `HAS_SERVICES`, `HAS_CALENDAR`,
`HAS_TEAM`, `HAS_RESERVATIONS`, `HAS_DELIVERY`…) sont la couche technique qui expose ce contexte
au workspace ET au frontstore ; l'entitlement (`MAX_APPOINTMENTS_PER_MONTH`) reste une couche
séparée, vérifiée au niveau abonnement (PHASE-10).

## C. Migrations prévues — PHASE-03 uniquement

**Un seul fichier** : `supabase/migrations/0098_business_foundation.sql` (≈ seed compris).
Rien d'autre : pas de table `activities` (P04), pas de `shops.activity_id` (P04), pas d'entitlements
(P10), pas de frontend, pas d'onboarding.

| Objet | Détail |
|---|---|
| `business_types` | `id uuid PK`, `slug text UNIQUE NOT NULL` + check format `^[a-z0-9]+(_[a-z0-9]+)*$`, `name/description/icon`, `status text NOT NULL DEFAULT 'active'` check `active/deprecated/draft`, `metadata jsonb NOT NULL DEFAULT '{}'`, `created/updated_at` + trigger `set_updated_at()` ; index sur `slug`, `status` |
| `capabilities` | `id uuid PK`, `code text UNIQUE NOT NULL` + check `^HAS_[A-Z0-9_]+$`, `label/description/category` (`category` = famille : commerce, catalogue, rendez-vous, équipe… → sert workspace ET frontstore), `status`, `created_at` ; index sur `code` |
| `business_type_capabilities` | `business_type_id FK → cascade`, `capability_id FK → cascade`, PK composite, `created_at` ; index sur `capability_id` |
| RLS | `ENABLE ROW LEVEL SECURITY` sur les 3 ; **lecture publique** (`SELECT using (true)`, référentiels non sensibles) ; **zéro policy d'écriture** (écriture service-role/migration uniquement, pattern `platform_members`) |
| Seed types | Les **4 verticals réels** uniquement (`mode`, `epicerie`, `beaute`, `tech` + labels FR de `verticals.ts`) — pas de `coiffeur`/`restaurant` spéculatifs (ajout administrable en P05). Statut `active` |
| Seed capabilities (~18) | `HAS_SHOP`, `HAS_PRODUCTS`, `HAS_PRODUCT_VARIANTS`, `HAS_SIZE_VARIANTS`, `HAS_COLOR_VARIANTS`, `HAS_COLLECTIONS`, `HAS_ORDERS`, `HAS_CUSTOMERS`, `HAS_TEAM`, `HAS_APPOINTMENTS`, `HAS_SERVICES`, `HAS_CALENDAR`, `HAS_RESERVATIONS`, `HAS_DELIVERY`, `HAS_PREPARATION_TIME`, `HAS_REVIEWS`, `HAS_ANALYTICS`, `HAS_PROMOTIONS` |
| Seed jonction | Mapping des 4 types legacy (ex. `epicerie` → SHOP, PRODUCTS, ORDERS, CUSTOMERS, DELIVERY, TEAM, ANALYTICS ; `mode` → + VARIANTS/SIZE/COLOR/COLLECTIONS/PROMOTIONS ; `beaute` → + APPOINTMENTS/SERVICES/REVIEWS ; `tech` → + VARIANTS/REVIEWS) |
| Idempotence | `IF NOT EXISTS`, contraintes nommées, `INSERT … ON CONFLICT DO NOTHING` — ré-exécutable |
| Rollback | Script inverse documenté (`DROP TABLE business_type_capabilities, capabilities, business_types`) — applicable car tables neuves sans dépendances |

**Procédure CLI (dev uniquement)** : `npx supabase db push --project-ref tlqgcmbdethmhqrablcy`
après vérifications — ref du projet (`supabase projects list`), `supabase migration list`,
`supabase db diff` attendu = ce fichier uniquement. Jamais de prod, rien de destructif.

## D. Risques et stratégie de test

| Risque | Probabilité / impact | Mitigation + test |
|---|---|---|
| Confusion dev/prod (MCP pointe la prod) | Faible / **critique** | Ref vérifiée avant chaque commande ; CLI explicite `--project-ref tlqgcmbdethmhqrablcy` ; test : `select` de contrôle post-push |
| Valeurs `business_type` inconnues en dev | Moyenne / faible | `SELECT DISTINCT business_type FROM shops` sur dev **avant** le push ; inconnues → log, traitées au backfill P05 (type `legacy` jamais de perte) |
| Seed non idempotent | Faible / moyen | `ON CONFLICT DO NOTHING` ; test : appliquer 2×, compter les lignes |
| Écriture référentiels bloquée (pas de policy) | Voulu / faible | Test négatif : INSERT en `authenticated` refusé ; écriture platform documentée pour P14 |
| Lecture publique abusive | Faible / faible | Contenu non sensible par construction (slugs, labels) ; test : SELECT anon OK, aucune colonne sensible |
| Régression legacy | Faible / **critique** | Aucune table/policy/fonction existante touchée (vérifiable par `db diff`) ; suite vitest 138/138 + fumée : création boutique, commande `create_order`, pages billing, preview |
| `slug`/`code` mutés plus tard | Faible / moyen | Contrainte + convention D3 (immuables) ; test : contrainte `status`/`deprecated` au lieu d'update |

### Tests obligatoires post-migration (résultats notés au livrable)

DB (tables/FK/index/contraintes/unicités) · RLS ALLOW (`anon`/`authenticated` lisent) + DENY
(écriture refusée, isolation : référentiels globaux donc sans tenant, à consigner) · Seed
(4 types, ~18 capabilities, jonctions conformes au mapping) · Types (création/modif/
activation-désactivation via service-role) · Backward compat (suite + fumée ci-dessus).

### Livrable attendu (après ta validation + exécution)

`PHASE 3 COMPLETE` en 14 points, puis STOP et présentation avant PHASE-04.
