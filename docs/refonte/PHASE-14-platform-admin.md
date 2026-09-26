# PHASE 14 — Platform Admin (3ᵉ espace produit)

> État : ✅ TERMINÉ — 2026-09-25 (DEV uniquement, prod non touchée).
> Journal : 2026-09-25 — audit money-flows + helper partagé + règle Hobby 12 fonctions ;
> livrable ci-dessous.

## Objectif

Espace Platform distinct du workspace business : Business (organisations, users, stores, types,
abonnements, vérifications, incidents, support, actions), Marketing (campagnes, segments, promos,
coupons, annonces, notifications), Analytics (businesses, conversion, abonnements, churn, MRR/ARR,
commandes, GMV, revenus, usage), Support (tickets, fiche business, historique, événements, logs),
Configuration (types, capabilities, templates, plans, entitlements, limites, prix, pays, devises,
paramètres). Permissions platform **séparées** des permissions business.

## Vérifications préalables

- [ ] Auditer : `/plateforme`, `platform_members`, `get_platform_role`/`is_platform_admin`,
      `panels.tsx`, outils existants (PromosTool, CampaignsTool…), `admin_audit_log`,
      `get_platform_*`, `platform_audience`.

## Étapes

1. Modèle d'admin : rôles platform (Admin/Support/Marketing/Finance/Analytics/Configuration),
   chaque action sensible loggée (étendre `admin_audit_log`, jamais de données sensibles).
2. Migrer les outils existants vers les nouvelles fondations (plans configurables, types
   administrables PHASE-05, pricing PHASE-12) sans régression du backoffice actuel.
3. Analytics financières §42 de la mission (Revenue/Growth/Economics/SaaS) branchées sur
   PHASE-10/12, pas sur des requêtes ad hoc.

## Livrable PHASE 14 COMPLETE (2026-09-25, DEV)

1. Tables créées/modifiées : aucune (contrainte `admin_audit_log.action` étendue uniquement).
2. Migrations effectuées : `0108_audit_actions.sql` (+`biztype_save`, +`payment_approve`,
   +`payment_reject`, +`promo_save`) — historique `0108|0108` ✅. Prod non touchée.
3. Relations : inchangées. 4. Index : inchangés. 5. RLS : inchangée (service-only).
4. Policies : inchangées.
5. Fonctions ajoutées/modifiées : aucune SQL ; helper `api/_lib/auditLog.ts` (`logAdminAudit`,
   best-effort + `required`), `logAudit` de `platform.ts` délégué (zéro changement d'appels).
6. Compatibilité legacy : audit best-effort post-action (ne casse jamais le flux observé) ;
   vitest 162/162 + `tsc` + build + lint 0 erreur.
7. Tests créés : preuve DB par sonde (insert `payment_approve` accepté puis supprimé, zéro trace).
8. Tests exécutés : suite verte (162/162) ; contrainte vérifiée effective.
9. Résultats : tous verts. Bug P05 corrigé au passage (`biztype_save` échouait sur l'ancien check).
10. Risques restants / décisions : (a) créations de promos (= abonnements offerts) accessibles
    au rôle marketing — tracées désormais, mais la restriction éventuelle à owner/admin est une
    décision d'accès (P15 review, pas de changement silencieux) ; (b) dashboards financiers
    (MRR/churn/coûts) dépendent des prix en DB → suivi pricing ; (c) **Vercel Hobby : 12
    fonctions max — `api/` en compte 11, règle opposable ajoutée au PLAN.md** (nouveaux
    endpoints en `?action=`, tests API sous `src/api/**` — le test `api/cron/*.test.ts`
    déplacé ce jour car il aurait fait la 12ᵉ fonction déployée).
11. Fichiers modifiés : `supabase/migrations/0108*`, `api/_lib/auditLog.ts` (créé),
    `api/admin/{platform,payments}.ts`, `src/api/cron/automation-dispatch.test.ts` (déplacé),
    `docs/refonte/`.
12. Prochaine phase recommandée : PHASE-15 (hardening : batch WITH CHECK, perfs, tenant).
13. Compatibilité prod : aucune (dev-only, zéro déploiement).
14. Validation : auto (mode continu) — revue humaine au STOP P17.
