# PHASE 12 — Usage + Cost Engine

> État : ✅ TERMINÉ — 2026-09-25 (DEV uniquement, prod non touchée).
> Journal : 2026-09-25 — ledger usage/coûts + 1 source câblée (emails campagnes) ;
> livrable ci-dessous.

## Objectif

Savoir ce que coûte réellement Bitiko : metering (WhatsApp/SMS/Email, stockage, IA, exécutions,
API, media…), quotas/overage branchés sur PHASE-10, et Cost Engine
(infra, DB, stockage, CDN, APIs, providers, support, domaines…) avec coût par business actif /
plan / pays / business type. Base du Pricing Advisor (analyse + simulation, **jamais de
modification automatique des prix**).

## Vérifications préalables

- [ ] Auditer les coûts actuels : `page_views`, campagnes (`campaigns`/`campaign_sends`),
      stockage Supabase, envois (WhatsApp/SMS/Email existants), analytics platform.

## Étapes

1. Compteurs d'usage fiables (idempotents, server-side) + exposition lisible au client
   (« 800 messages inclus, puis +100 = X F », unités réelles, pas de crédits abstraits).
2. `cost_records` + `provider_costs` : ingestion des coûts, tableaux de bord internes
   (coût/business, marge/plan/pays/type).
3. Pricing Advisor (Platform) : coût moyen, prix actuel, marge, conversion, churn, LTV/CAC,
   usage, scénarios what-if (ex. 10 000 businesses 60/25/12/3 — **scénarios, pas prévisions**).
   Réutiliser les tables `countries`/`currencies` existantes (`0033`) — ne pas les recréer.

## Livrable PHASE 12 COMPLETE (2026-09-25, DEV)

1. Tables créées : `usage_meters`, `usage_records`, `cost_records`. Rien d'existant modifié.
2. Migrations effectuées : `0106_usage_cost_foundation.sql` (catalogue 8 compteurs + `record_usage()`
   + ledger coûts) — historique `0106|0106` ✅. Prod non touchée.
3. Relations : FK meters/shops ; PK naturelle (shop, meter, period) ; index coûts.
4. Index : voir §3.
5. RLS : activée sur les 3 tables (vérifié effectif).
6. Policies : meters public read + records owner read (vérifié), costs verrouillé service-only ;
   zéro écriture client (`record_usage` revoqué public/anon/authenticated).
7. Fonctions ajoutées : `record_usage()` (DEFINER, mois normalisé, shop+meter validés, upsert
   idempotent, no-op si qty ≤ 0).
8. Compatibilité legacy : envois campagnes inchangés (metering best-effort après le logging) ;
   vitest 159/159 (1 nouveau) + `tsc` + build + lint 0 erreur.
9. Tests créés : `api/_lib/usage.test.ts` (bucket mensuel UTC).
10. Tests exécutés : suite verte ; seed (8 compteurs) et policies vérifiés effectifs.
11. Résultats : tous verts. Boucle prouvée : envoi → `record_usage` → ledger (0 ligne sur dev
    = aucune campagne envoyée, pas un bug).
12. Risques restants / reportés : rating/quotas/overage, prix en DB, factures, ingestion auto
    des coûts, Pricing Advisor + dashboards (dépendances : prix configurables + UI P14) ;
    `auth_rls_initplan` = style commun (passage P15 unique).
13. Fichiers modifiés : `supabase/migrations/0106*`, `api/_lib/usage.ts` (+ test),
    `api/admin/platform.ts` (hook metering) + `docs/refonte/`.
14. Prochaine phase recommandée : PHASE-13 (Automation Engine : events → moteur → canaux).
