# PHASE-04 — Dossier de design (validation requise AVANT toute migration)

> Statut : 🟨 DESIGN EN VALIDATION — **aucune migration exécutée, aucun schéma modifié.**
> Objet : `USER → ORGANIZATION → MEMBERSHIP → ROLES/PERMISSIONS`, en cohabitation avec
> `shops`/`shop_members` (décision D2.1/D2.2 de l'architecture cible).

## A. État actuel vérifié (ce avec quoi on cohabite, pas ce qu'on casse)

- **Auth** : Supabase Auth ; `profiles(id, role owner/admin)` ; `AuthContext` (init lazy hors `/`,
  listener app-lifetime) ; `usePlatformRole` (via `get_platform_role()`).
- **Ownership boutique** : `shops.owner_id`. Lecteurs : `api/` (`account`, `onboarding`,
  `settlePayment`, `admin/*`, `cron/renewal-reminders`, `userDeletion`), services (`shop`,
  `team`, `admin`, `platform`), et toutes les RLS owner (`auth.uid() = owner_id`).
- **Équipe boutique** : `shop_members` (rôles `manager/vendeur` uniquement), invite par email +
  `claim_shop_invites()` au login, `shop_role()`, policies team additives, `team.service.ts`
  côté client (list/invite/role/remove via RLS `owner manage`).
- **Platform** : `platform_members` (`owner/admin/dev/marketing`), `is_platform_admin()`,
  `get_platform_role()` — séparation déjà réelle, à ne pas mélanger aux rôles business.
- **Drift dev restant** : 4 fonctions pirates (`create_reservation`, `create_shop_organization`,
  `delete_shop_organization`, `get_plans`), anon-callable, déjà cassées (tables supprimées en
  P03) — **DROP prévu dans la migration (validation demandée ci-dessous)**.

## B. Cible P04 (fondation, pas le workspace)

```text
USER ── organization_members (rôle owner/admin/manager/staff) ──→ ORGANIZATIONS (l'activité)
        │                                                            │ 1:N
        │                                                     shops.organization_id (nullable)
        └── (miroir, compat) shop_members / shops.owner_id (CONSERVÉS)
```

- `organizations` : `id`, `name`, `slug` (nullable unique — futurs URLs/affichage, pas de
  contrainte métier maintenant), `status` (`active/suspended/draft`), `metadata` jsonb
  (paramètres futurs), timestamps + `set_updated_at()`.
- `organization_members` : `id`, `organization_id` FK cascade, `user_id` FK auth.users cascade,
  `role` TEXT check (`owner/admin/manager/staff`), `email` nullable (invites, parité shop),
  `invited_by`, `accepted_at`, `created_at`, unique `(organization_id, email)` + index `user_id`.
  Rôles custom : **reportés** (contrainte TEXT extensible plus tard ; table dédiée en P06/P14
  si besoin — le check actuel n'interdit rien d'autre qu'une valeur, pas une évolution).
- `permissions` (catalogue en table) : `code` unique (`products.read`, `products.create`,
  `products.update`, `products.delete`, `orders.read`, `orders.update`, `orders.cancel`,
  `customers.read`, `customers.update`, `analytics.read`, `settings.manage`, `billing.manage`,
  `team.manage`, `storefront.manage`), `label`, `category`. Seed du catalogue uniquement.
- `role_permissions(role, permission)` : mapping seedé **owner+admin = tout** ; mappings
  manager/staff définis en P06 avec les modules (l'assignation sans modules serait fictive).
- `shops.organization_id` : nullable, FK → organizations **ON DELETE RESTRICT** (conservateur :
  pas de suppression en cascade d'établissements par accident ; aucun flux de suppression
  d'orga n'existe en P04).
- Backfill (migration, rejouable) : 1 organization par `owner_id` distinct de `shops`
  (nom = nom de sa première boutique, `metadata.backfilled_from_owner`), membership `owner`
  pour lui, `organization_id` renseigné ; membres `shop_members` réclamés (`user_id` non null)
  → memberships (`manager→manager`, `vendeur→staff`) ; invites en attente ignorées (reprises
  par le flux shop existant, unifié en P06). Dev : 0 shop → no-op vérifié.
- RLS (additif uniquement, rien d'existant touché) : lecture membre
  (`organizations` : le caller est membre ; `organization_members` : ses orgas) ;
  **zéro policy d'écriture** (création/invitation via RPC/service-role en P06 — pattern
  éprouvé) ; `permissions`/`role_permissions` : lecture publique, écriture platform-only.
- Séparation stricte : aucun rôle platform dans ces tables, aucune permission business dans
  `platform_members`.

## C. Migration prévue — un seul fichier `0099_organizations_foundation.sql`

Préambule DROP (validation demandée) des 4 fonctions pirates → `organizations`,
`organization_members`, `permissions`, `role_permissions` (+ checks, index, trigger
`updated_at`, commentaires) → RLS + policies (lecture membre, référentiels publics) →
backfill idempotent (garde `organization_id IS NULL` + `ON CONFLICT DO NOTHING`) →
seed catalogue permissions + mappings owner/admin. Idempotent, rollback documenté
(DROP dans l'ordre inverse — tables neuves, sans dépendants hors backfill).

**Procédure** : mêmes garde-fous qu'en P03 (ref dev, diff, dry-run, push dev, 0 donnée
historique modifiée hors backfill additif, RLS). Prod jamais touchée.

## D. Risques et tests

| Risque | Mitigation + test |
|---|---|
| Backfill dupliqué à la ré-exécution | Gardes NULL + conflits ; test : 2 applis, 1 orga/owner |
| Backfill faux (mauvais owner) | Requête déterministe (1ère boutique) ; test : graphe owner→orga→shops vérifié |
| Écritures bloquées (pas de policy) | Voulu (P06 ouvre les flux) ; test négatif INSERT authenticated refusé |
| RLS membre (fuite inter-orga) | Matrice ALLOW/DENY : membre lit son orga, pas celle d'autrui ; non-membre rien |
| Régression legacy | `shop_members`/`owner_id`/policies intacts (`db diff` ne montre que l'ajout) ; vitest + `tsc` + fumée |
| DROP pirates casse quelque chose | Vérifié : aucun code ne les appelle, déjà inertes ; test : advisors sans findings nouveaux |

### Livrable attendu (après validation + exécution)
`PHASE 4 COMPLETE` en 14 points, puis STOP avant PHASE-05.
