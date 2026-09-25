# PHASE 01 — Audit validé contre le code réel

> État : ⬜ NON DÉMARRÉ
> Journal : — (l'audit externe est validé comme base, la confrontation au code reste à faire)

## Objectif

Vérifier chaque affirmation de l'audit contre le réel, **avant toute modification de schéma**.
Tout écart audit ↔ code est signalé ici et le plan (PHASE-02 et suivantes) est adapté en conséquence.

## Points d'ancrage déjà repérés (à vérifier, pas à croire sur parole)

- 97 migrations dans `supabase/migrations/` (`0001_init.sql` → `0097_security_review.sql`).
- Tables réelles : `profiles`, `shops`, `categories`, `products`, `product_images`, `orders`, `order_items`,
  `delivery_zones`, `delivery_secteurs`, `delivery_villes`, `shop_subscriptions`, `wave_payments`, `pages`,
  `product_variants`, `whatsapp_verifications`, `check_email_attempts`, `page_views`, `platform_members`,
  `campaigns`, `campaign_sends`, `shop_publish_history`, `promo_codes`, `promo_redemptions`,
  `shop_saved_themes`, `admin_audit_log` (⚠️ audit logging **partiel** : existe côté backoffice, pas
  au niveau business), `customers`, `shop_members`.
- `shop_id` cité dans 43 fichiers de migration → isolation RLS actuelle basée sur `shop_id` (à confirmer
  policy par policy).
- `shops.business_type` : colonne **TEXT** (`0038_shop_business_type.sql`) + logique en dur dans
  `src/config/verticals.ts` (+ `storeTemplates.ts`, `OnboardingPage.tsx`, `SettingsPage.tsx`,
  `TemplateLibraryPanel.tsx`) → **pas de table `business_types`, pas de capabilities**.
- Fonctions `SECURITY DEFINER` structurantes : `create_order`, `set_order_status`, `effective_plan_key`,
  `enforce_*` / `plan_max_*` (limites de plan côté serveur — point fort à conserver),
  `is_platform_admin`, `get_platform_role`, `shop_role()`, `claim_shop_invites`, `redeem_promo_code`.
- Paiement : `api/_lib/wave.ts` + `api/_lib/settlePayment.ts`, routes `api/billing/*`,
  `api/account.ts`, `api/admin/payments.ts`, tables `wave_payments`, `shop_subscriptions`,
  `promo_codes` → Wave **couplé en direct**, pas d'abstraction provider.
- Équipe : `shop_members` (`0093`) + team policies (`0094`) → membership existe **au niveau shop**,
  pas au niveau organization (qui n'existe pas).

## Vérifications préalables (checklist — tout cocher avant PHASE-02)

- [ ] Relire les migrations structurantes : `0001`, `0002_rls`, `0005_multitenant`, `0011`, `0012_billing`,
      `0026`, `0027`, `0038`, `0048`, `0093`, `0094`, `0097`.
- [ ] Lister les policies RLS effectives **sur la base dev** (pas seulement dans les fichiers) et noter
      celles qui reposent sur `auth.uid()`, `shop_members`/`shop_role()`, `is_platform_admin`.
- [ ] Lister les fonctions `SECURITY DEFINER` effectives + leur `search_path` (risque : `search_path`
      mutable — à vérifier).
- [ ] Inventorier toutes les références à `shop_id` (migrations, `api/`, `src/services`, RLS).
- [ ] Inventorier toutes les références à `business_type` / `vertical` (7 fichiers + colonne TEXT).
- [ ] Inventorier plan/subscription : `src/config/plans.ts`, `effective_plan_key`, `enforce_*`,
      `shop_subscriptions`, `api/billing/*`, `BillingPage.tsx`, `useRedeemPromo`.
- [ ] Inventorier Wave : `api/_lib/wave.ts`, `settlePayment.ts`, `wave_payments`, statuts, webhooks,
      `PaymentProofDialog`, preuves manuelles (`api/account.ts`).
- [ ] Inventorier routes/API concernées (`api/` : `admin/`, `billing/`, `cron/`, `account.ts`,
      `onboarding.ts`, `og.ts`, `sitemap.ts`) + composants frontend concernés (features `billing`,
      `platform`, `store-builder`, pages admin).
- [ ] Trancher : que représente `shop` aujourd'hui — storefront ? business ? organization ?
      (critique pour PHASE-04 ; ne pas renommer pour l'esthétique, migrer pour le besoin).
- [ ] Classer chaque partie existante : KEEP / REFACTOR / REDESIGN / REBUILD / REMOVE /
      SECURITY REPLACEMENT (règle absolue de la mission, §0).

## Interdits de cette phase

- Aucune modification de schéma, de RLS, de code métier. Lecture seule (+ requêtes SELECT sur dev
  si besoin, jamais sur prod).

## Critères de sortie

- [ ] Chaque section du rapport d'audit porte la mention `CONFIRMÉ` / `CONTREDIT (détail)` / `À COMPLÉTER`.
- [ ] Le tableau KEEP/REFACTOR/REDESIGN/REBUILD/REMOVE/SECURITY REPLACEMENT est rempli et relu.
- [ ] Les contradictions trouvées ont un plan d'adaptation écrit (annexe à ce fichier).
- [ ] PHASE-02 peut démarrer sur des fondations factuelles.

## Livrable

`PHASE 1 COMPLETE` (format §4 du PLAN.md, points 9–14 adaptés : écarts trouvés, fichiers relus,
risques, PHASE-02 recommandée).
