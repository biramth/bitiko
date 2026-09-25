# PHASE 10 — Billing + Entitlements

> État : ⬜ NON DÉMARRÉ
> Journal : —
> Pré-requis : PHASE-03 ✅, PHASE-04 ✅.

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

## Critères de sortie

- [ ] Prix modifiable sans code, historique conservé ; limites vérifiées **serveur** (tests négatifs
      Free vs Pro via API directe).
- [ ] Facturation Wave actuelle intacte (prépare PHASE-11, ne la touche pas).
- [ ] `PHASE 10 COMPLETE` rédigé.
