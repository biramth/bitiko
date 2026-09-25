# PHASE 17 — Production migration (bascule + REMOVE LEGACY)

> État : ⬜ NON DÉMARRÉ
> Journal : —
> Pré-requis : PHASE-16 ✅. **Ne pas continuer si une fondation est instable.**

## Objectif

Bascule dev → prod puis retrait du legacy (`REMOVE LEGACY`), sans perte :
données, RLS, relations, URLs, commandes, clients, produits, analytics.
Environnements `local/development/preview/production` séparés, secrets jamais committés,
aucune opération locale ne touche prod par accident.

## Vérifications préalables

- [ ] CI/CD : lint, typecheck, tests, security checks, build, migration check, rollback —
      `.github/` existant à compléter, pas à contourner.
- [ ] Stratégie backup/rollback prod écrite et testée sur dev (restauration réellement rejouée).

## Étapes

1. Gel + backup prod, rejouer les migrations validées sur dev **une par une** avec vérification
   (jamais `db push` aveugle des deux environnements d'un coup — règle AGENTS.md).
2. Backfills prod monitorés, compat legacy active, fumée complète (parcours §67 mission).
3. Bascule, surveillance (logs structurés, error tracking, métriques, health checks,
   provider/payment/webhook/automation failures — cf. PHASE-15).
4. `REMOVE LEGACY` : seulement après période de cohabitation probante — suppression en migration
   dédiée, réversible tant que possible, avec preuve d'inutilisation (logs d'accès aux chemins legacy).

## Critères de sortie

- [ ] Critères §67 validés en prod (user : compte → activités → équipe → type → workspace →
      produits → template → publication → domaine → analytics → plan ; admin : les 12 capacités).
- [ ] Legacy retiré ou, à défaut, liste datée des restes avec raison + échéance (pas de dette floue).
- [ ] `PHASE 17 COMPLETE` rédigé = clôture de la refonte ; `PLAN.md` passé à `✅ TERMINÉ`.
