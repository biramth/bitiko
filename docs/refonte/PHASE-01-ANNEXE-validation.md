# PHASE-01 — ANNEXE : validation de l'audit contre le code réel

> Rédigée le 2026-09-25. Méthode : lecture intégrale des migrations structurantes
> (`0001`, `0002`, `0003`, `0005`, `0011`, `0012`, `0026`, `0027`, `0028`, `0033`, `0034`, `0038`,
> `0048`, `0093`, `0094`, `0095`, `0097`), inspection de l'état effectif **en lecture seule**
> (catalogue `pg_policies`/`pg_proc`/`pg_tables`, advisors — **projet connecté au MCP = PROD
> `jebmorovxoxecgixievu` : aucune donnée lue ni écrite, métadonnées uniquement ; parité dev
> supposée via les migrations, À VÉRIFIER sur dev avant la première migration de PHASE-03**),
> inventaires `shop_id` (43 migrations, 21 fichiers `src`, 11 fichiers `api`),
> `business_type`, plans, Wave, routes et frontend.
> Légende : ✅ CONFIRMÉ · ⚠️ CONTREDIT / ÉCART (détail + adaptation) · ❓ À COMPLÉTER.

## 1. Verdicts par section de l'audit

| § Audit | Verdict | Preuve / détail |
|---|---|---|
| 1. Stack | ✅ | React+TS+Vite+Tailwind+Supabase, fonctions `api/`, 97 migrations, vitest 138 tests |
| 2. Architecture actuelle | ✅ | Monolithe front + serverless + Postgres RLS, pas de backend dédié |
| 3. Structure frontend | ✅ | `app/components/config/features/hooks/layouts/lib/pages/routes/services/types/utils` ; 18 services, 11 features |
| 4. Structure backend | ✅ | `api/` : `_lib/` (wave, settlePayment, supabaseAdmin…), `admin/`, `billing/` (3 routes), `cron/`, `account.ts`, `onboarding.ts`, `og.ts`, `sitemap.ts` |
| 5. Database | ✅ + ⚠️ | 27 tables réelles (liste §2) ; ⚠️ `countries`/`currencies` existent déjà (`0033`) — ne pas les recréer en PHASE-12/14 |
| 6. Authentication | ✅ | Supabase Auth, `profiles` (rôles `owner/admin`), ⚠️ **leaked-password protection désactivée** (advisor WARN → PHASE-15) |
| 7. Authorization | ⚠️ | Base saine (owner/member/platform) mais rôles boutique limités à `manager/vendeur`, pas de permissions granulaires (→ PHASE-04) |
| 8. Multi-tenancy | ✅ | RLS `shop_id` partout, vérifiée effective ; 7 tables verrouillées service-role-only (✅ volontaire) |
| 9. Business Types | ✅ | Colonne TEXT + `verticals.ts` (4 valeurs : `mode/epicerie/beaute/tech`) — aucune table, aucune capability |
| 10. Dashboard | ✅ | Sidebar unique `AdminLayout`, pas de workspace par métier |
| 11. Storefront | ✅ | Rendu sections depuis `shops.layout_sections` (jsonb), `TenantContext`, séparation admin/visiteur à renforcer (PHASE-07) |
| 12. Templates | ✅ | `template_id` + `shop_saved_themes` + historique ; pas de galerie/démo |
| 13. Page Builder | ✅ | Existant fonctionnel (`StoreBuilderPage`, brouillon/publié) — étendre, pas reconstruire |
| 14. Billing | ⚠️ | **Dérive live** : `plans.ts` (free 15 produits, 3 000/10 000 F) ≠ DB (`plan_max_*` : free **8**, prix mission 4 900/14 900 F absents, pas de plan BUSINESS) — un free à 10 produits passe le front mais casse au trigger. Priorité PHASE-10 |
| 15. Payments | ✅ | Wave direct (`api/_lib/wave.ts`, `wave_payments`, preuves manuelles) — aucune abstraction provider |
| 16. APIs | ✅ | Chaîne auth→…→DB à systématiser (convention PHASE-02) ; tout `api/` touché par `shop_id` (11 fichiers) |
| 17. Storage | ✅ | Buckets + miroirs manager (`0097`) ; durcissement uploads en PHASE-15 |
| 18. Analytics | ✅ | `page_views`, `get_platform_*`, `get_shop_visit_stats` — pas de MRR/churn éco (PHASE-12/14) |
| 19. Platform Admin | ✅ | `/plateforme`, `platform_members` (owner/admin/dev/marketing), `panels.tsx` — pas de pricing/types administrables |
| 20. Security | ⚠️ | Solide base, 6 écarts précis (voir §3) — aucun critique bloquant, tous planifiés |
| 21. Performance | ✅ | Chantiers récents (lazy, chunks) ; budgets à acter (PHASE-15) |
| 22. Infrastructure | ✅ | 1 projet Supabase + Vercel, multi-tenant — à conserver (jamais 1 projet/client) |
| 23. Deployment | ✅ | `main`/`develop`, Vercel preview/prod — CI à compléter (PHASE-17) |
| 24. Tests | ✅ | 138 tests vitest ; RLS/E2E/multi-tenant à construire (PHASE-16) |
| 25. Technical debt | ✅ | Drift plans, WITH CHECK manquants, jsonb builder, prix en dur — listés §3/§4 |
| 26. Features à supprimer | ⚠️ | OTP WhatsApp, `shop_vibe`, `delivery_zones` **déjà supprimés** (`0044`, `0089`, `0010`) ; reste à vérifier : `whatsapp_verifications` orpheline ? (PHASE-02) |
| 27. Features à conserver | ✅ | Commandes, catalogue, builder, billing Wave, équipes shop, platform — toutes migrées en compat |
| 28. Features à reconstruire | ✅ | Orga/memberships, types/capabilities, entitlements, payment engine, automatisations — phasage inchangé |
| 29. Risques critiques | ⚠️ | Aucun risque vital caché ; le plus coûteux serait de casser RLS/billing en migrant trop vite — d'où compat imposée |
| 30. Architecture cible | ✅ | Schéma mission conservé, ancré : shop fusionné (voir §4) → Organization à côté, pas à la place |
| 31. Plan de migration | ✅ | 17 phases conservées ; 4 adaptations (§5) |
| 32. Ordre d'implémentation | ✅ | Inchangé : fondation DB d'abord, frontend branché après |

## 2. Inventaire réel (référence pour les phases)

- **Tables (27)** : `profiles`, `shops`, `categories`, `products`, `product_images`, `orders`,
  `order_items`, `delivery_secteurs`, `delivery_villes`, `shop_subscriptions`, `wave_payments`,
  `pages`, `product_variants`, `check_email_attempts`, `page_views`, `platform_members`,
  `campaigns`, `campaign_sends`, `shop_publish_history`, `promo_codes`, `promo_redemptions`,
  `shop_saved_themes`, `admin_audit_log`, `customers`, `shop_members`, `countries`, `currencies`
  (26 lignes `pg_tables` : + `whatsapp_verifications` ? **absente** — `0044` l'a supprimée avec l'OTP ;
  à confirmer : la migration `0020` la créait, `0044` la supprime — cohérent avec §26).
- **RLS** : activée sur 100 % des tables publiques ; 7 tables sans policy = verrouillées
  Data API (service-role only, volontaire et sain).
- **Fonctions SECURITY DEFINER (~36)** : toutes avec `search_path` explicite (vérifié effectif).
  Grants durcis par rôle (modèle : revoke public/anon + grant authenticated, ou internal-only).
- **`business_type`** : 7 fichiers (`verticals.ts`, `storeTemplates.ts`, `shop.service.ts`,
  `TemplateLibraryPanel.tsx`, `SettingsPage.tsx`, `OnboardingPage.tsx`, `database.types.ts`)
  + colonne TEXT (backfillée depuis `template_id` en `0038`).
- **Wave** : `api/_lib/wave.ts` (Checkout API directe), `settlePayment.ts`, `wave_payments`
  (`client_reference` unique = idempotence), `api/billing/{create-checkout,confirm,webhook}`,
  `api/admin/payments.ts`, preuves manuelles `api/account.ts`, liens statiques
  `WAVE_*_PAYMENT_LINK` dans `plans.ts`.

## 3. Écarts audit ↔ code réel (sécurité & fonctionnel)

1. **`WITH CHECK` manquants (5 policies, effectif)** : `shops: manager update`, `shops: owner update`,
   `orders: team advance status`, `Manager manages pages` (ALL), `customers: manager update`.
   Conséquences : un manager peut réassigner `owner_id`/`slug` du shop ; un vendeur peut modifier
   `total`/coordonnées d'une commande (pas seulement le statut) ; un manager peut déplacer des
   pages entre boutiques. → Durcissement PHASE-15 (pas d'urgence vitale : rôles attribués par l'owner).
2. **`shops` en lecture publique intégrale** (`using (true)`) : tout visiteur lit **toutes** les
   colonnes — `whatsapp_number`, `address`, `payment_instructions`, `onboarding_responses`,
   `layout_sections`. Accepté pour le storefront, mais `payment_instructions` et réponses
   d'onboarding n'ont rien à y faire → scinder (vue publique restreinte ou colonnes déplacées),
   PHASE-07/15.
3. **`shop_subscriptions: public read`** (`0014`, effectif) : plans/statuts/échéances de toutes les
   boutiques lisibles par tous (fuite BI, sensibilité faible). → Restreindre ou justifier, PHASE-15.
4. **`set_order_customer_email` appelable en anon** (voulu, write-once + 2 h + format) : un attaquant
   muni d'un UUID de commande frais peut y attacher son email puis lire la commande (nom/tél/adresse
   de l'acheteur) via le compte client. UUID imprévisibles = risque résiduel accepté et documenté
   (`0095`), mais à durcir (token court plutôt qu'UUID brut), PHASE-15.
5. **Casse email incohérente** : `set_order_customer_email` minuscule, mais `orders/customer self read`
   comparent `customer_email = jwt.email` **sans** `lower()` (seul `customers` le fait) → un acheteur
   dont l'email auth contient une majuscule ne voit pas ses commandes. Bug fonctionnel mineur → PHASE-05/15.
6. **Config auth** : leaked-password protection désactivée → activer, PHASE-15.
- Non-problèmes vérifiés : `shop_role()` exécutable en anon (retourne null, sans fuite) ;
  `create_order`/`get_landing_promo` en anon (voulus, validés serveur) ; triggers `enforce_*`
  non appelables utilement en RPC ; fonctions platform gatées par `is_platform_admin()` en interne.

## 4. Classification et réponse « que représente `shop` ? »

**`shop` = BUSINESS + STOREFRONT fusionnés dans une seule ligne** : `owner_id` + équipe (`shop_members`)
+ facturation (`shop_subscriptions`) + identité pro (`whatsapp_number`, `address`, `business_type`,
`payment_instructions`) **et** vitrine (`slug`, `custom_domain`, `template_id`, `layout_sections`,
`theme_config`). Multi-shop = multi-business par compte (plafond 5, `0097`). **Décision** : ne pas
renommer ; introduire `organizations` à côté (propriétaire de billing/équipe) et y rattacher les
shops (PHASE-04) — shop garde le rôle storefront.

| Classe | Éléments |
|---|---|
| KEEP | RLS `shop_id`+owner/`shop_role` (additives) ; `create_order` DEFINER ; écritures billing/platform en service-role only ; triggers `enforce_*` (mécanisme) ; invite/claim équipe ; `platform_members`+gates ; historique publications/thèmes ; `client_reference` unique ; storefront public |
| REFACTOR | Drift plans (source unique → PHASE-10) ; 5 policies sans WITH CHECK ; update vendeur pleine-ligne ; `shops` public intégral ; `shop_subscriptions` public ; email case ; `set_order_customer_email` (token) |
| REDESIGN | `shops` fusionné → Organization+Store ; `business_type` TEXT → tables types/capabilities ; plans TEXT → plans/entitlements ; Wave direct → Payment Engine ; rôles `manager/vendeur` → permissions granulaires |
| REBUILD | Rien — le builder, le billing et la platform s'étendent, pas de table rase |
| REMOVE | Déjà fait : OTP WhatsApp, `shop_vibe`, `delivery_zones`, `seed_default_delivery_zones` ; à vérifier : rien d'autre en suspens |
| SECURITY REPLACEMENT | Rien à remplacer ; toggles et durcissements listés (PHASE-15) |

## 5. Adaptations du plan (appliquées aux fichiers de phases)

1. **PHASE-10 priorisée dans son contenu** : première étape = source unique des plans + résorption
   de la dérive (free 8 vs 15, prix 3 000/10 000 vs hypothèses 4 900/14 900, plan BUSINESS manquant).
2. **PHASE-15 étendue** : batch WITH CHECK, scoping vendeur, `shops` public restreint,
   `shop_subscriptions` public à justifier/restreindre, token pour l'email client, leaked-password ON,
   revue EXECUTE anon.
3. **PHASE-12/14** : réutiliser `countries`/`currencies` existantes, ne pas les recréer.
4. **PHASE-02** : trancher le sort de `payment_instructions`/`onboarding_responses` (hors lecture publique).

## 6. Livrable PHASE-01

```text
PHASE 1 COMPLETE
1. Tables créées/modifiées : aucune (phase de lecture — 27 tables inventoriées, §2)
2. Migrations effectuées : aucune (12 relues intégralement + balayage des 97)
3. Relations : graphe shop-centré confirmé (tout FK mène à shops, sauf platform_members → auth.users)
4. Index : présents (slug lower unique, produits/commandes, owner_id via 0097) — revue perfs en PHASE-15
5. RLS : 100 % tables, effectif conforme aux fichiers ; 7 verrouillées volontaires
6. Policies : 66 effectives ; 5 sans WITH CHECK listées (§3.1)
7. Fonctions : ~36 DEFINER, search_path OK, grants vérifiés un par un sur les sensibles
8. Compatibilité legacy : sans objet (rien modifié)
9. Tests créés : aucun (suivi : matrices ALLOW/DENY à écrire en PHASE-03)
10. Tests exécutés : inspection effective prod (métadonnées uniquement) + advisors sécurité
11. Résultats : 6 écarts documentés, aucun bloquant ; parité dev à confirmer avant PHASE-03
12. Risques restants : parité dev/prod non vérifiée côté données ; rôles limités ; drift plans actif
13. Fichiers modifiés : docs/refonte/ uniquement (aucun code, aucun schéma)
14. Prochaine phase recommandée : PHASE-02 (trancher §5.4 + sorts en suspens), puis PHASE-03
```
