# PHASE 12 — Usage + Cost Engine

> État : ⬜ NON DÉMARRÉ
> Journal : —
> Pré-requis : PHASE-10 ✅, PHASE-11 ✅.

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

## Critères de sortie

- [ ] MRR/ARR/coût/marge calculés automatiquement et réconciliés avec la comptabilité manuelle.
- [ ] `PHASE 12 COMPLETE` rédigé.
