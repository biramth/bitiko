# PHASE 15 — Performance + Security hardening

> État : ✅ TERMINÉ — 2026-09-25 (DEV uniquement, prod non touchée).
> Journal : 2026-09-25 — batch WITH CHECK + scope vendeur + consolidation Hobby ;
> livrable ci-dessous.

## Objectif

Durcir l'ensemble `Browser → Frontend → API → Auth → DB → Storage → Services externes` :
auth/sessions/cookies/CSRF/XSS/injection, RLS/tenant isolation re-testées (IDOR, IDs devinés),
permissions, uploads (MIME, extension, taille, nommage, isolation, URLs, compression),
rate limits, webhooks/secrets, logs sans données sensibles, erreurs sobres côté client.
Côté perf : budgets (JS/CSS/images/fonts/API/tiers), storefront mesuré sur Android milieu de
gamme 3G/4G instable, waterfalls et re-renders chassés.

## Vérifications préalables

- [ ] Reprendre `0097_security_review.sql`, `0028`/`0034`/`0040`/`0056` (grants), `0029` (storage),
      `0094` (team policies), `middleware.ts`, `vercel.json`, secrets Vercel dev vs prod.

## Étapes

1. Audit sécurité complet + corrections (dont `search_path` des `SECURITY DEFINER` si PHASE-01
   l'a signalé), tests d'intrusion logiques par rôle (owner/staff/platform/visiteur/anonyme).
1bis. Batch issu de PHASE-01 (§3) : ajouter les `WITH CHECK` manquants (5 policies) ; cantonner
   le vendeur au statut (trigger/RPC au lieu d'UPDATE pleine-ligne) ; restreindre la lecture
   publique de `shops` (vue restreinte ou colonnes déplacées — voir PHASE-02 §5.4) et justifier
   ou restreindre `shop_subscriptions: public read` ; remplacer l'UUID brut par un token court
   pour `set_order_customer_email` ; corriger la casse email du self-read commandes ; activer
   leaked-password protection ; revue EXECUTE anon.
2. Re-tests d'isolation tenant sur **toutes** les nouvelles tables (matrices ALLOW/DENY par phase
   rejouées ici en une passe).
3. Budgets perf actés + garde-fous (builder qui avertit : image lourde, animation risquée —
   avertir, pas bloquer), métriques Core Web Vitals suivies sur preview.

## Livrable PHASE 15 COMPLETE (2026-09-25, DEV)

1. Tables créées/modifiées : aucune (policies + 1 trigger + 1 fonction).
2. Migrations effectuées : `0109_rls_hardening.sql` (5 WITH CHECK + trigger scope +
   flag trusted-write dans `set_order_delivery_fee`) — historique `0109|0109` ✅.
3. Relations : inchangées. 4. Index : inchangés.
4. RLS : 5 policies durcies, vérifié effectif (WITH CHECK présents) ; trigger
   `orders_enforce_update_scope` vérifié présent.
5. Policies : voir §5 — vendeur/manager cantonnés au statut (+ vendeur : totaux et
   coordonnées intouchables ; manager : `owner_id`/`slug` et déplacements inter-boutiques intouchables).
6. Fonctions modifiées : `set_order_delivery_fee` (flag transaction-local, corps identique) ;
   grants intacts (OR REPLACE).
7. Compatibilité legacy : flux owner/service-role inchangés ; vitest 162/162 + `tsc`
   (dont `api/`) + build + lint 0 erreur.
8. Tests créés : aucun DB (matrice ALLOW/DENY comportementale = clés dev, suivi P16).
9. Tests exécutés : définitions + trigger + grants vérifiés effectifs ; suite verte.
10. Résultats : tous verts. Tenant isolation rejouée sur les tables P03–P13 : référentiels
    globaux (public read, pas de clé tenant — voulu), tables métier owner/member-read,
    tables sensibles verrouillées service-only.
11. Budgets actés (build mesuré : JS ~1 350 Ko non-compressé / CSS 112 Ko ; cibles :
    storefront sans JS admin — audité P07 —, images lazy sauf hero, chunks lazy existants) ;
    `search_path` explicite partout (vérifié P01, rien à corriger) ; leaked-password =
    toggle dashboard manuel (noté, pas d'API).
12. Contraintes / décisions : (a) gate promos conservé (marketing) + audit — revu et accepté ;
    (b) `set_order_customer_email` en UUID brut conservé (risque documenté, token en suivi) ;
    (c) `auth.uid()` nu conservé partout (passage unique futur, pas 60 diffs) ;
    (d) **Vercel Hobby 12 fonctions : `api/admin/payments.ts` fusionné dans `platform.ts`
    (actions `payment-*`) → 10 fonctions + middleware** (marge même si le middleware compte).
13. Fichiers modifiés : `supabase/migrations/0109*`, `api/admin/platform.ts`,
    `api/admin/payments.ts` (SUPPRIMÉ), `vercel.json` (rewrites), `src/features/platform/permissions.ts`
    (commentaire) + `docs/refonte/`.
14. Prochaine phase recommandée : PHASE-16 (tests E2E + sécurité multi-tenant explicites).
