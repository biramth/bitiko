# BITIKO — Plan de refonte (document maître)

> Date de création : 2026-09-25 · Branche de travail : `develop` (jamais de push direct sur `main`)
> Audit externe : **validé comme base de travail, pas comme vérité absolue** — chaque phase commence par une
> confrontation au code réel avant toute modification.

## 1. Comment lire et maintenir ce dossier

- Chaque phase possède son fichier `PHASE-XX-*.md` avec un en-tête `État` et un `Journal`.
- Convention d'état (mettre à jour à chaque avancement réel, jamais d'anticipation) :
  - `⬜ NON DÉMARRÉ` — rien n'a été modifié pour cette phase.
  - `🟨 EN COURS — <ce qui est fait / ce qui reste>` — travail commencé sur `develop`, non terminé.
  - `✅ TERMINÉ — <date> — <commit(s)>` — critères de sortie vérifiés ET testés (voir §4).
- Le tableau §3 est le **seul reflet officiel de l'avancement** : toute complétion de phase met à jour
  le tableau ici ET l'en-tête du fichier de phase, dans le même commit.
- Règle d'honnêteté : on ne coche ✅ que ce qui a été **exécuté et vérifié** (migration appliquée sur dev,
  tests passés, RLS testées ALLOW + DENY). Le reste demeure ⬜ ou 🟨 avec l'explication du blocage.

## 2. Contraintes globales (chaque phase, sans exception)

```text
SECURITY + MULTI-TENANCY + MOBILE-FIRST + PERFORMANCE
+ RESOURCE EFFICIENCY + MAINTAINABILITY + SCALABILITY + ECONOMIC VIABILITY
```

- Bitiko est **fonctionnel en production** : refonte progressive, jamais de « big bang ».
- On ne supprime ni tables utilisées, ni policies RLS fonctionnelles, ni le paiement Wave,
  ni templates, ni fonctionnalités non migrées.
- Stratégie imposée pour tout remplacement :

```text
OLD SYSTEM → COMPATIBILITY LAYER → NEW SYSTEM → MIGRATION → REMOVE LEGACY
```

- Moyens autorisés : nouvelles tables, nouvelles colonnes **nullable**, migrations progressives,
  backfill, compatibilité temporaire, feature flags.
- Avant chaque migration : `Schema analysis → Migration design → Impact analysis → Backup/rollback
  strategy → Migration → Tests → Verification`. Migrations **idempotentes** quand possible,
  explicites, documentées, réversibles quand possible.
- Vocabulaire cible (le terme `merchant` reste toléré dans le legacy, sans enfermer le produit) :
  `User → Organization/Business → Membership → Roles/Permissions → Stores/Data/Modules`,
  avec `Business Type → Capabilities → Modules`, et `Subscription → Plan → Entitlements`
  (capability ≠ entitlement, voir PHASE-03).

## 3. Tableau d'avancement officiel

| # | Phase | Objectif (1 ligne) | Dépend de | État |
|---|-------|--------------------|-----------|------|
| 01 | [Audit validé contre le code réel](PHASE-01-audit.md) | Confronter l'audit au réel : migrations, tables, RLS, `shop_id`, `business_type`, plans, Wave, routes, frontend | — | ✅ TERMINÉ — 2026-09-25 |
| 02 | [Architecture cible](PHASE-02-architecture.md) | Figer l'architecture cible et les décisions (docs `/architecture`, `/security`, …) | 01 | ✅ TERMINÉ — 2026-09-25 |
| 03 | [Database Foundation](PHASE-03-database-foundation.md) | Créer `business_types`, `capabilities`, `business_type_capabilities` (+ audit-logging minimal), sans casser l'existant | 01, 02 | ✅ TERMINÉ — 2026-09-25 (DEV) |
| 04 | [Auth + Organizations + Memberships](PHASE-04-auth-organizations.md) | Modèle `USER → ORGANIZATION → MEMBERSHIP → ROLES`, coexistence avec `shops`/`shop_members` | 03 | ✅ TERMINÉ — 2026-09-25 (DEV) |
| 05 | [Business Types + Capabilities (activation)](PHASE-05-business-types.md) | Seed des types/capabilities, couche de compat avec `shops.business_type`, exposition Platform | 03, 04 | ✅ TERMINÉ — 2026-09-25 (DEV) |
| 06 | [Business Workspace](PHASE-06-workspace.md) | Dashboard généré depuis `Business Type + Capabilities + Entitlements + Modules` | 05 | ✅ TERMINÉ — 2026-09-25 (DEV) |
| 07 | [Storefront engine](PHASE-07-storefront.md) | Moteur `Store → Pages → Sections → Blocks`, storefront allégé séparé du workspace | 04, 05 | ✅ TERMINÉ — 2026-09-25 (DEV) |
| 08 | [Template system](PHASE-08-templates.md) | Vrais templates préconstruits, galerie + démo, `Template ≠ Business Type` | 07 | ✅ TERMINÉ — 2026-09-25 (DEV) |
| 09 | [Page Builder](PHASE-09-page-builder.md) | Éditeur visuel data-driven, header/footer configurables, sans `<script>` arbitraire | 07, 08 | ✅ TERMINÉ — 2026-09-25 (DEV) |
| 10 | [Billing + Entitlements](PHASE-10-billing.md) | `Subscription → Plan → Entitlements`, prix configurables + historique, quotas/overage | 03, 04 | ✅ TERMINÉ — 2026-09-25 (DEV, fondation : entitlements+limites source unique ; prix/factures/usage en suivi) |
| 11 | [Payment Engine](PHASE-11-payments.md) | `Application → Payment Engine → Provider → Wave` ; Wave = `TEMPORARY` provider conservé | 10 | ✅ TERMINÉ — 2026-09-25 (DEV) |
| 12 | [Usage + Cost Engine](PHASE-12-usage-cost.md) | Metering, quotas, coût réel par business/plan/pays | 10, 11 | ✅ TERMINÉ — 2026-09-25 (DEV, fondation : ledger + 1 source ; rating/advisor en suivi) |
| 13 | [Automation Engine](PHASE-13-automations.md) | `Business Event → Automation Engine → Channel` (WhatsApp/SMS/Email/Push) | 05, 10 | ⬜ NON DÉMARRÉ |
| 14 | [Platform Admin](PHASE-14-platform-admin.md) | Business, marketing, analytics, support, configuration (types, plans, prix, pays…) | 05, 10, 12 | ⬜ NON DÉMARRÉ |
| 15 | [Performance + Security hardening](PHASE-15-hardening.md) | Budgets, durcissement complet browser→DB→infra, uploads, tenant isolation | 06–14 | ⬜ NON DÉMARRÉ |
| 16 | [Testing](PHASE-16-testing.md) | Unit + intégration + E2E + sécurité multi-tenant explicites | 03–15 | ⬜ NON DÉMARRÉ |
| 17 | [Production migration](PHASE-17-production.md) | Bascule dev→prod, REMOVE LEGACY, validation critères §67 de la mission | 16 | ⬜ NON DÉMARRÉ |

## 4. Livrable de fin de phase (obligatoire, format imposé)

```text
PHASE X COMPLETE
1. Tables créées/modifiées · 2. Migrations effectuées · 3. Relations · 4. Index
5. RLS · 6. Policies · 7. Fonctions ajoutées/modifiées · 8. Compatibilité legacy
9. Tests créés · 10. Tests exécutés · 11. Résultats · 12. Risques restants
13. Fichiers modifiés · 14. Prochaine phase recommandée
```

Et à chaque phase : analyser → définir → implémenter → tester → vérifier
(sécurité, performance, mobile, multi-tenant) → documenter → phase suivante.
**Ne pas continuer si une fondation critique est instable.**
