# PHASE 04 — Auth + Organizations + Memberships

> État : 🟨 EN COURS — design rédigé, en attente de validation décideur ; migrations NON exécutées.
> Dossier de validation : [PHASE-04-DESIGN.md](PHASE-04-DESIGN.md) (état actuel A, cible B,
> migration prévue C, risques/tests D).
> Journal : 2026-09-25 — état des lieux (lecteurs `owner_id`/`shop_members`, drift dev) + design rédigé.

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

## Interdits

- Pas de suppression de `shop_members`/`shops.owner_id`, pas de réécriture des RLS existantes :
  ajout de policies pour les nouvelles relations uniquement, tests ALLOW/DENY comme en PHASE-03.

## Critères de sortie

- [ ] Création multi-activités, invitations, rôles différents par organization — testés.
- [ ] Anciens parcours (1 user = 1 shop, équipe shop) inchangés et verts.
- [ ] `PHASE 4 COMPLETE` rédigé ; STOP et présentation avant PHASE-05.
