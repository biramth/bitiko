# PHASE 03 — Database Foundation (business_types + capabilities)

> État : ✅ TERMINÉ — 2026-09-25 (DEV uniquement, prod non touchée).
> Dossier de validation : [PHASE-03-DESIGN.md](PHASE-03-DESIGN.md).
> Journal : 2026-09-25 — design validé par le décideur (9 contraintes) ; migration 0098
> appliquée sur dev (`tlqgcmbdethmhqrablcy`) ; livrable ci-dessous.

## Objectif

Poser la fondation : `business_types`, `capabilities`, `business_type_capabilities`
(+ base d'audit logging au niveau business si tranchée en PHASE-02), **sans casser l'existant**
et sans construire les moteurs des phases suivantes (pricing advisor, cost engine, automatisations,
providers, page builder — architecture préparée, pas implémentée).

## 0. Vérification anti-doublons (obligatoire avant CREATE TABLE)

Confronter chaque concept à l'existant réel ; ne créer que ce qui manque :

| Concept visé | Existant réel | Décision de départ (à confirmer) |
|---|---|---|
| Business Type | `shops.business_type` TEXT (`0038`) + `src/config/verticals.ts` en dur | Créer `business_types` (entité configurable), garder la colonne comme legacy + compat |
| Plan limits serveur | `effective_plan_key`, `enforce_*`, `plan_max_*` (`0027`, `0039`, `0046`) | **KEEP** — ne pas réécrire, la future table `entitlements` s'y branchera en PHASE-10 |
| Audit logging | `admin_audit_log` (`0086`, côté backoffice uniquement) | Étendre le principe au niveau business OU nouvelle table `business_audit_log` — trancher en PHASE-02 |
| Membership | `shop_members` + `shop_role()` + `claim_shop_invites` (`0093`, `0094`, `0097`) | **KEEP** — la future `memberships` organization cohabitera (PHASE-04) |
| Isolation tenant | RLS sur `shop_id` (43 migrations) | **KEEP** — les nouvelles tables héritent du même contexte, jamais de réécriture |

## 1. Modèle à créer (noms de départ, validés en PHASE-02)

```text
business_types        (id uuid pk, slug text unique stable, name, description,
                       icon, status [active|deprecated|draft], metadata jsonb,
                       created_at, updated_at)
capabilities          (id uuid pk, code text unique ex. HAS_RESERVATIONS,
                       label, description, category, status, created_at)
business_type_capabilities (business_type_id fk, capability_id fk,
                       pk composite, created_at)
```

- `slug` stable et immuable après création (les URLs/compat s'y réfèrent, jamais à l'id).
- Liste de capabilities **extensible** par insert, jamais par migration de code ; une capability
  déclare un besoin (« peut utiliser »), pas une implémentation.
- Seed initial **issu des verticals réels** (`verticals.ts` + `storeTemplates.ts`), pas de la liste
  d'exemples de la mission : chaque `slug` seedé mappe 1:1 une valeur actuelle de
  `shops.business_type` (compat garantie). Ex. `restaurant → HAS_PRODUCTS, HAS_DELIVERY_ZONES,
  HAS_PREPARATION_TIME, HAS_RESERVATIONS, HAS_REVIEWS…`.
- Statuts : un type `deprecated` reste lisible (boutiques existantes) mais non proposable.

## 2. RLS et isolation (à documenter AVANT d'écrire la migration)

- [ ] Documenter les policies actuelles touchées (lecture seule sur dev).
- [ ] `business_types`/`capabilities` : lecture publique (référentiels), écriture **platform admin
      uniquement** (`is_platform_admin` / `get_platform_role` existants — réutiliser, pas dupliquer).
- [ ] `business_type_capabilities` : mêmes règles.
- [ ] Tester explicitement : `Business A → Business A = ALLOW`, `Business A → Business B = DENY`,
      `Owner → management = ALLOW`, `Staff → restricted = DENY` (tester ALLOW **et** DENY).
- [ ] Audit-logging (si créé ici) : écriture via fonction `SECURITY DEFINER` à `search_path` fixe,
      lecture restreinte au tenant + platform ; **jamais de données sensibles** (pas de tokens,
      pas de payloads de paiement).

## 3. Compatibilité legacy (le système actuel continue de fonctionner à l'identique)

- `shops.business_type` TEXT **conservée** ; ajouter si tranché : `shops.business_type_id` **nullable**
  + backfill depuis le seed (mapping valeur TEXT → slug), sans contrainte NOT NULL tant que
  tous les flux (onboarding `OnboardingPage.tsx`, `shop.service.ts`, `api/onboarding.ts`,
  `SettingsPage.tsx`) ne sont pas migrés (PHASE-05).
- Fonction/vues de compat si besoin (ex. lecture unifiée type effectif), marquées `LEGACY` +
  date de retrait prévue.
- Aucune modification du frontend global à cette phase (règle §15) : uniquement la couche
  `Database → Domain → Server-side → API/service`.

## 4. Processus migration (une migration = un fichier versionné `supabase/migrations/`)

`Schema analysis → design → impact analysis → backup/rollback → migration → tests → verification`.
Migration idempotente (`IF NOT EXISTS`, contraintes nommées + `DO ... EXCEPTION` si nécessaire),
appliquée **d'abord sur dev** (`tlqgcmbdethmhqrablcy`), jamais prod à cette phase.
Prévoir le script inverse (DROP … si vide / suppression seed) même s'il n'est pas exécuté.

## 5. Tests obligatoires (tous exécutés, résultats notés)

- Database : tables, FK, index (`slug`, `code`, jonction), contraintes, unicités.
- RLS : accès correct / interdit / isolation tenant (matrice §2 cochée).
- Business Types : création, modification, activation/désactivation, slug immuable.
- Capabilities : association, suppression, lecture, extensibilité par insert.
- Backward compat : parcours existants intacts (création boutique, onboarding, templates,
  commandes via `create_order`, billing Wave, pages) — suite `vitest` verte + fumée manuelle sur preview.

## Livrable PHASE 3 COMPLETE (2026-09-25, DEV `tlqgcmbdethmhqrablcy`)

1. Tables créées : `business_types`, `capabilities`, `business_type_capabilities`
   (+ trigger `updated_at` sur types). Aucune table existante modifiée.
2. Migrations effectuées : `0098_business_foundation.sql` appliquée sur DEV (historique CLI
   `0098|0098` ✅). Au passage : `0090–0096` réconciliées (`repair`, objets vérifiés un par un),
   `0097` appliquée par le push. Prod non touchée (zéro commande hors `--project-ref dev`).
3. Relations : jonction PK composite + 2 FK cascade ; index sur `capability_id`, `slug`, `code`.
4. Index : voir §3 + `shops_owner_id_idx` (0097) vérifié présent.
5. RLS : activée sur les 3 tables (vérifié effectif).
6. Policies : exactement 3, `SELECT using (true)` (vérifié effectif) ; **zéro policy d'écriture**
   → écritures anon/authenticated refusées par défaut-deny (vérifié par définition ; test REST
   comportemental restant : 2 min avec la clé anon dev depuis le dashboard — commandes :
   `GET /rest/v1/business_types` → 200 avec lignes ; `POST /rest/v1/capabilities` → 403).
7. Fonctions ajoutées/modifiées : aucune (réutilisation de `set_updated_at()`).
8. Compatibilité legacy : totale — 0 ligne existante touchée (dev : 0 shops ; aucune colonne,
   policy, fonction ou route modifiée ; frontend/routes/storefronts/commandes/clients/
   abonnements intacts ; suite vitest 138/138 + `tsc` verts après migration).
9. Tests créés : vérifications catalogue (requêtes §10-11) ; à industrialiser en PHASE-16.
10. Tests exécutés : seed (4 types / 18 capabilities / 36 jonctions, mapping 12/7/9/8 conforme),
    RLS (flags + définitions), advisors dev (aucun finding nouveau lié à 0098), non-régression.
11. Résultats : tous verts. Écarts traités : historique CLI réparé (0090–0096 vérifiés objet par
    objet) ; 5 tables pirates hors-migrations **supprimées sur DEV avec validation explicite**
    (14 types spéculatifs, 23 capabilities, 117 jonctions, 0 org/membre — aucun code ne les lisait).
12. Risques restants : (a) 4 fonctions pirates (`create_reservation`, `create_shop_organization`,
    `delete_shop_organization`, `get_plans`, anon-callable, désormais cassées car tables
    supprimées) à DROP en PHASE-04 — **validation demandée** ; (b) test REST comportemental
    (clé anon dev) à jouer ; (c) parité prod à construire en PHASE-17 uniquement.
13. Fichiers modifiés : `supabase/migrations/0098_business_foundation.sql` (créé, avec préambule
    de cleanup approuvé) + `docs/refonte/` (design, livrable). Zéro code applicatif.
14. Prochaine phase recommandée : PHASE-04 (activities + memberships + lien shops, avec DROP
    des 4 fonctions pirates + décision sort des colonnes publiques sensibles).

## Risques connus d'avance

- Divergence des valeurs TEXT `business_type` en base vs `verticals.ts` → le backfill doit gérer
  les valeurs inconnues (type `custom`/`legacy` + log, jamais de perte).
- Tentation d'étendre au pricing/entitlements/paiements → **refuser**, c'est PHASE-10/11.
