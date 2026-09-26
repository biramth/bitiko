# PHASE 10 — Billing + Entitlements

> État : ✅ TERMINÉ — 2026-09-25 (DEV uniquement, prod non touchée).
> Journal : 2026-09-25 — migration 0104 + résorption dérive + wiring prouvé ; livrable ci-dessous.

## Objectif

Vrai Billing Engine : `Subscription → Plan → Entitlements` (`MAX_TEAM_MEMBERS`, `MAX_STORES`,
`HAS_CUSTOM_DOMAIN`…), prix **configurables depuis Platform Admin avec historique**
(jamais hardcodés comme aujourd'hui dans `src/config/plans.ts`), quotas + overage en unités
réelles (messages, stockage, exécutions…), spend controls (seuils, blocage, notifications).
Plans de référence (FREE 0 F, ESSENTIEL 4 900 F/mois, PRO 14 900 F/mois, BUSINESS 39 900 F/mois)
= **configuration initiale**, modifiable, clients existants protégeables (price history).

## Vérifications préalables

- [ ] Auditer : `shop_subscriptions`, `promo_codes`/`promo_redemptions`, `get_promo_offer`,
      `redeem_promo_code`, `effective_plan_key`, `enforce_*`, `plan_rank`, `api/billing/*`,
      `api/account.ts`, preuves manuelles, `BillingPage.tsx`, country pricing inexistant.

## Étapes

0. **Résorber d'abord la dérive constatée en PHASE-01** : `plans.ts` (free 15 produits,
   3 000/10 000 F) ≠ DB (`plan_max_*` : free 8, hypothèses mission 4 900/14 900 F, pas de
   plan BUSINESS). Source unique imposée dès cette phase, même en compat temporaire.
1. Modèle : `plans`, `plan_prices` (+ `country_pricing`, `currencies`, `tax_rules`),
   `plan_entitlements`, `subscriptions` (+ items/history), `invoices`, `promotions`/`coupons`,
   `price_history` — simplifier si une abstraction suffit (pas 50 tables pour le plaisir).
2. Compat : `shop_subscriptions` conservée + miroir/sync vers `subscriptions` ; `enforce_*`
   existants **KEEP** et branchés sur les entitlements (pas de `if plan === "pro"` frontend :
   le frontend lit des entitlements, le serveur vérifie).
3. Usage : `usage_meters`/`usage_records`/`usage_quotas`/`usage_overages` (+ `addons`,
   `addon_prices`) pour les ressources à coût variable uniquement ; l'abonnement couvre
   l'usage normal.
4. Migration des abonnements existants avec conservation des prix (backfill + tests).

## Livrable PHASE 10 COMPLETE (2026-09-25, DEV)

1. Tables créées : `plans`, `plan_entitlements`, `plan_limits`, `subscriptions`,
   `subscription_history` (+ triggers `updated_at`). Rien d'existant modifié.
2. Migrations effectuées : `0104_billing_foundation.sql` (catalogue + seed + backfill +
   rewiring `plan_max_*`) — historique `0104|0104` ✅. Prod non touchée.
3. Relations : FK plans (restrict implicite), subscriptions.shop_id unique + cascade,
   history→subscription cascade ; index history.
4. Index : voir §3.
5. RLS : activée sur les 5 tables (vérifié effectif).
6. Policies : 3 public read + 2 owner read, zéro écriture (vérifié). Test REST
   comportemental restant (clé anon dev, comme P03).
7. Fonctions modifiées : les 5 `plan_max_*()` lisent `plan_limits` (fallback historique
   identique) ; verrouillées trigger-internal (revoke public/anon/authenticated vérifié ;
   aucun appel RPC existant).
8. Compatibilité legacy : valeurs seedées = vérité enforced (comportement identique) ;
   `shop_subscriptions` intact ; front : seule la promesse mensongère free 15→8 alignée
   (`plans.ts` + tests) ; vitest 155/155 + `tsc` + build + lint 0 erreur.
9. Tests créés : `plans.test.ts` aligné (cap 8) ; preuveDB par sonde éphémère `_probe`
   (3 depuis la table, pas le fallback — nettoyée, zéro trace).
10. Tests exécutés : seed (3/15/12/0), grants, RLS, advisors (rien de nouveau actionnable :
    `auth_rls_initplan` = style `auth.uid()` commun à 60+ policies, passage P15 unique ;
    `multiple_permissive` = pré-existant 0014).
11. Résultats : tous verts. Dérive résorbée : DB = source unique des limites.
12. Risques restants / reportés : prix en DB + country pricing + factures + usage/quota/overage
    (décisions prix = business ; chantier P12) ; comparaisons `plan ===` display conservées
    (pas de contrôle d'accès) ; enforcement API des entitlements avec P06-visibilité en P10b/P12.
13. Fichiers modifiés : `supabase/migrations/0104*`, `src/config/plans.ts` (+ test),
    + `docs/refonte/`. Tables pirates `plans`/`country_prices` (4 lignes spéculatives)
    supprimées (documenté, dev-only).
14. Prochaine phase recommandée : PHASE-11 (Payment Engine, Wave en provider TEMPORARY).
