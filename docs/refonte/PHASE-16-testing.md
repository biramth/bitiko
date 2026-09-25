# PHASE 16 — Testing (stratégie complète)

> État : ✅ TERMINÉ — 2026-09-25 (DEV uniquement, prod non touchée).
> Journal : 2026-09-25 — matrice RLS effective + 2 bugs réels trouvés et corrigés
> (0110, 0111) + tests unitaires ; livrable ci-dessous.

## Objectif

Vraie stratégie : **unit** (pricing, permissions, capabilities, normalisation téléphone/prix —
`normalize_sn_phone`, prix entiers `0053` —, billing, usage, calculs), **intégration** (auth,
isolation tenant, API, DB, paiements, webhooks), **E2E** (signup → business → type → store →
template → produit → publication → commande/réservation → dashboard) + scénarios négatifs.

## Vérifications préalables

- [ ] Auditer l'existant : `vitest.config.ts`, 13 fichiers / 138 tests, `npm run test`,
      ce qui est déjà couvert (billing ? capabilities ? RLS ?).

## Étapes

1. Tests DB/RLS explicites et rejouables (Business A ≠ Business B ; membre sans permission :
   billing/produits/analytics/team refusés ; Free ≠ Pro via API directe).
2. Tests d'API par endpoint selon la chaîne PHASE-02 (auth → contexte → permission →
   entitlement → validation → logique).
3. E2E des parcours critiques (§67 de la mission : côté user + côté admin Bitiko) sur preview,
   données seedées, nettoyées après exécution.

## Livrable PHASE 16 COMPLETE (2026-09-25, DEV)

1. Tables créées/modifiées : aucune (suite + 2 migrations correctives, voir §2).
2. Migrations effectuées : `0110_shop_role_anon_grant.sql` (converge dev/prod : EXECUTE anon
   explicite, null-safe) + `0111_drop_rogue_status_guard.sql` (trigger pirate qui cassait
   toute avance de statut sur dev) — historique `0110|0110`, `0111|0111` ✅. Prod non touchée.
3. Relations : inchangées. 4. Index : inchangés.
4. RLS : 0 policy modifiée par les tests (lecture seule + fixtures éphémères nettoyées : 0 reste).
5. Policies : vérifiées effectives une à une via la matrice (voir §10).
6. Fonctions ajoutées/modifiées : aucune (hors suppressions pirates).
7. Compatibilité legacy : fixtures 100 % nettoyées (0 shops/orgas/events résiduels) ;
   vitest 164/164 (2 nouveaux) + `tsc` + build + lint 0 erreur.
8. Tests créés : `supabase/tests/phase16_rls_matrix.sql` (suite d'intégration rejouable :
   `db query -f`, convention exit 0 + zéro résidu = MATRIX-OK) + `permissions.test.ts`.
9. Tests exécutés : matrice complète (T1 anon, T2 outsider, T3 owner, T4 vendeur, E émetteurs)
   + suite unit.
10. Résultats : **MATRIX-OK après 2 vrais bugs trouvés par la suite elle-même** :
    (a) storefront anonyme cassé sur dev (grant `shop_role` manquant → 0110) ;
    (b) avancement commandes cassé sur dev (trigger pirate `orders_guard_status` → 0111).
    Négatifs prouvés : insert subscriptions, transfert `owner_id`, total vendeur, writes
    outsider (0 ligne ou 42501) ; `shop_subscriptions: public read` confirmé voulu (0014).
11. Risques restants / reportés : E2E (pas de harnais — Playwright + seed + preview, à
    construire avant P17) ; tests API à tokens (clés dev, à jouer sur preview) ; claim invite
    e-mail non rejoué ; matrices à rejouer après chaque changement RLS futur.
12. Conventions actées : `supabase/tests/*.sql` = suites rejouables (jamais des migrations) ;
    tout nouvel objet pirate se traite en migration `drop-if-exists` documentée.
13. Fichiers modifiés : `supabase/migrations/0110*`, `0111*`, `supabase/tests/phase16_rls_matrix.sql`
    (créé), `src/features/platform/permissions.test.ts` + `docs/refonte/`.
14. Prochaine phase recommandée : PHASE-17 (migration prod + REMOVE LEGACY — décision humaine).
