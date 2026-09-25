# PHASE 14 — Platform Admin (3ᵉ espace produit)

> État : ⬜ NON DÉMARRÉ
> Journal : —
> Pré-requis : PHASE-05 ✅, PHASE-10 ✅, PHASE-12 ✅.

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

## Critères de sortie

- [ ] Un support peut retrouver un business, voir son historique et agir, avec traçabilité.
- [ ] Prix/entitlements/types modifiables sans code depuis Platform (selon phases).
- [ ] `PHASE 14 COMPLETE` rédigé.
