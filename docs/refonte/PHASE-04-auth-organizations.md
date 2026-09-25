# PHASE 04 — Auth + Organizations + Memberships

> État : ✅ TERMINÉ — 2026-09-25 (DEV uniquement, prod non touchée).
> Dossier de validation : [PHASE-04-DESIGN.md](PHASE-04-DESIGN.md).
> Journal : 2026-09-25 — design validé en continu (mode automatique) ; migrations 0099+0100
> appliquées sur dev ; livrable ci-dessous.

## Objectif

Introduire le modèle `USER → ORGANIZATION → MEMBERSHIP → ROLES/PERMISSIONS → STORES/DATA`,
en **cohabitation** avec `shops`/`shop_members` (décision de nommage et de lien tranchée en PHASE-02,
à partir de la réponse PHASE-01 sur « que représente `shop` ? »).

## Vérifications préalables

- [ ] Relire `AuthContext.tsx`, `usePlatformRole`, `shop_role()`, `claim_shop_invites`,
      team policies (`0094`), `platform_members` + `get_platform_role`.
- [ ] Cartographier qui lit `shops.owner_id` vs `shop_members` aujourd'hui (frontend, `api/`, RLS).

## Étapes

1. Créer `organizations`, `organization_members` (rôles Owner/Admin/Manager/Staff + custom prévus,
   permissions granulaires `products.read…`, `billing.manage`… — catalogue en table, vérification
   **côté serveur** ; le frontend ne fait que masquer).
2. Lier sans casser : `shops.organization_id` **nullable** + backfill (1 shop → 1 organization
   portée par l'`owner` actuel) ; `shop_members` conservés, miroir ou vue de compat vers
   `organization_members` tant que les deux servent.
3. Contexte actif : un utilisateur multi-organizations change de contexte ; chaque endpoint résout
   `Authentication → Organization Context → Permission` avant toute logique (convention PHASE-02).
4. Séparer permissions Business vs Platform Admin (jamais de rôle mixte implicite).

## Livrable PHASE 4 COMPLETE (2026-09-25, DEV `tlqgcmbdethmhqrablcy`)

1. Tables créées : `organizations`, `organization_members`, `permissions`, `role_permissions`
   (+ trigger `updated_at` sur organizations). Zéro table existante modifiée.
2. Migrations effectuées : `0099_organizations_foundation.sql` + `0100_cleanup_duplicate_org_index.sql`
   appliquées sur DEV (historique `0099|0099`, `0100|0100` ✅). Prod non touchée.
3. Relations : FK cascade (membres→orga, mappings→permissions), `shops.organization_id` FK RESTRICT
   + index `shops_organization_id_idx` ; index `user_id`/`organization_id` sur membres.
4. Index : voir §3 ; doublon prototype (`shops_organization_idx`) supprimé via 0100.
5. RLS : activée sur les 4 tables (vérifié effectif).
6. Policies : `organizations: member read`, `organization_members: member read`
   (via `organization_role()`, sans récursion), `permissions`/`role_permissions: public read`
   (vérifié effectif) ; **zéro écriture client** (refus par défaut-deny).
7. Fonctions ajoutées : `organization_role(uuid)` (DEFINER, `search_path` fixe, grants
   anon+authenticated **volontaires et load-bearing** — comme `shop_role()`, ne retourne que le
   rôle du caller). Supprimées (validé) : 4 fonctions pirates + 2 triggers pirates sur `shops`
   (dont un BEFORE INSERT qui aurait cassé toute création de boutique).
8. Compatibilité legacy : `shops.owner_id`, `shop_members`, toutes policies/fonctions existantes
   intacts (`db diff` prospectif : ajouts seuls) ; vitest 138/138 + `tsc` verts ; dev : 0 orga
   (0 shop → backfill no-op vérifié).
9. Tests créés : vérifications catalogue (requêtes) ; industrialisation en PHASE-16.
10. Tests exécutés : tables/RLS/policies/grants/seed (14 permissions, 28 mappings owner+admin),
    backfill, advisors (plus aucun finding nouveau : reste `organization_role`, documenté accepté).
11. Résultats : tous verts.
12. Risques restants : création/invitation d'orga sans flux (RPC en P06) ; rôles custom reportés ;
    mappings manager/staff en P06 ; colonnes publiques sensibles (`payment_instructions`) en P06/P15.
13. Fichiers modifiés : `supabase/migrations/0099*`, `0100*` (créés) + `docs/refonte/`. Zéro code applicatif.
14. Prochaine phase recommandée : PHASE-05 (activation types/capabilities + compat `business_type`).

## Critères de sortie

- [ ] Création multi-activités, invitations, rôles différents par organization — testés.
- [ ] Anciens parcours (1 user = 1 shop, équipe shop) inchangés et verts.
- [ ] `PHASE 4 COMPLETE` rédigé ; STOP et présentation avant PHASE-05.
