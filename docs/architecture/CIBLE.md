# BITIKO — Architecture cible (décisions figées en PHASE-02)

> Statut : **FIGÉ le 2026-09-25** (sauf mention « reporté »). Toute phase 03–17 qui contredit
> ce document doit d'abord le faire amender ici, avec alternatives et motifs — jamais en silence
> dans une migration.
> Base factuelle : [PHASE-01](../refonte/PHASE-01-audit.md) +
> [annexe de validation](../refonte/PHASE-01-ANNEXE-validation.md).

## D0. Décision fondatrice : `shop` ≠ activité

Historiquement `shop` = la boutique (le SaaS s'adressait aux commerçants). La transition actée :
**l'activité de la personne peut ne pas être une boutique** (coiffeur, spa, restaurant, artisan…).
Donc :

- `shop` **= canal de vente / vitrine en ligne** (slug, domaine, template, catalogue, commandes).
  Le nom est conservé (URLs, RLS, contrats) — il désigne le point de vente, plus jamais l'activité.
- L'**activité** = nouvelle entité `organization`/`business` (identité pro, équipe, abonnement,
  business type). Une activité **peut** avoir 0, 1 ou N boutiques (un spa sans vente en ligne
  n'a pas de vitrine ; une enseigne peut en avoir plusieurs).
- Conséquence directe : tout ce qui est « qui suis-je / qui travaille avec moi / à quoi ai-je
  droit » migre vers l'organization ; tout ce qui est « que voit le visiteur » reste au shop.

## D1. Entités cibles (responsabilités + ce qu'elles ne sont PAS)

```text
USER (auth.users / profiles) — un humain. N'est PAS une activité.
  ↓ appartient à (N organizations, rôles potentiellement différents)
ORGANIZATION / BUSINESS — l'activité (salon, restaurant…). Porte : identité pro,
  business_type_id, équipe, abonnement, entitlements, données métier.
  N'est PAS une vitrine : elle peut exister sans shop.
  ↓ MEMBERSHIP (organization_members) — lien user↔organization + rôle.
      Rôles : Owner / Admin / Manager / Staff / custom. Permissions granulaires
      (products.read, orders.update, billing.manage…) vérifiées CÔTÉ SERVEUR.
      N'est PAS le legacy shop_members (qui cohabite en compat, PHASE-04).
  ↓ possède
STORE — alias conceptuel de shop (canal de vente). Porte : slug/domaine, template,
  catalogue, commandes, pages. Rattaché via shops.organization_id (nullable puis requis).
  ↓ BUSINESS_TYPE → CAPABILITIES → MODULES (workspace + recommandations vitrine)
  ↓ SUBSCRIPTION → PLAN → ENTITLEMENTS (quotas, limites, accès — PHASE-10)
```

- `BUSINESS_TYPE` : référentiel configurable (slug stable/immobile, statuts
  active/deprecated/draft). N'est PAS un template, PAS une ambiance.
- `CAPABILITY` (`HAS_*`) : besoin déclaratif d'un métier (« peut utiliser »). N'est PAS de la
  logique métier, PAS une autorisation (c'est le rôle de l'entitlement).
- `ENTITLEMENT` (`MAX_*`, `HAS_*` plan) : ce que l'abonnement autorise, vérifié serveur.
- `TEMPLATE` : site préconstruit (présentation seule). Changement = présentation, jamais données.
- `PAYMENT PROVIDER` : Wave requalifié `TEMPORARY`, derrière l'interface du Payment Engine (PHASE-11).

## D2. Décisions structurantes (alternative rejetée + motif)

| # | Décision | Alternative rejetée | Motif |
|---|---|---|---|
| D2.1 | Organizations **à côté** de `shops` + lien nullable + backfill 1:1 | Étendre `shops` ou renommer en masse | Préserve URLs, RLS, commandes, billing ; migration progressive imposée |
| D2.2 | `shop_members` conservé + miroir vers `organization_members` | Suppression dès PHASE-04 | Équipes actuelles intactes ; retrait seulement après cohabitation probante |
| D2.3 | Capabilities lues serveur, `if businessType ===` interdit dans le neuf | Brancher le type dans le code existant | Seule façon d'ajouter un métier sans réécrire l'app |
| D2.4 | Plans/entitlements en tables configurables | Corriger juste la dérive (8 vs 15…) | La dérive PHASE-01 prouve que le durillon double-source est intenable |
| D2.5 | Wave = provider `TEMPORARY` conservé à l'identique | Le remplacer ou le laisser couplé | Légal/technique incomplets + billing actuel fonctionnel |
| D2.6 | `payment_instructions` / `onboarding_responses` hors lecture publique | Statu quo | Données non-vitrine exposées à tous (PHASE-01 §3.2) — déplacement ou vue restreinte |
| D2.7 | Pas de microservices, pas de bus d'événements complexe | Architecture distribuée prématurée | Monolithe modulaire (serverless + Postgres) jusqu'à besoin réel (mission §62) |

## D3. Règles de nommage (tout le neuf s'y conforme)

- Tables `snake_case` pluriel, PK `id uuid default gen_random_uuid()`, `created_at`/`updated_at`
  (`set_updated_at()`), FK `on delete cascade` vers le parent tenant sauf justification écrite.
- Codes stables et immuables : `business_types.slug`, `capabilities.code` (`HAS_*`), entitlements
  (`MAX_*`/`HAS_*`). Jamais d'id exposé comme identifiant métier ; UUID v4 non séquentiels.
- Prix/entités monétaires : entiers en centimes ou `numeric` + devise explicite, jamais de texte libre.
- Téléphones : canonique via `normalize_sn_phone` (étendre par pays en PHASE-10+, pas de doublon).

## D4. Conventions API (chaque endpoint, sans exception)

```text
Authentication → Organization Context → Permission → Entitlement → Validation → Business Logic → Database
```

- Erreurs : `{ error: { code, message } }`, codes stables (`plan_limit_exceeded`, `not_authorized`,
  `shop_limit_reached`…), jamais de stack trace ni de détail interne au client.
- Écritures sensibles (billing, rôles, plans) : service-role ou DEFINER à `search_path` fixe +
  contrôle `auth.uid()` dans le corps ; jamais de confiance envers le frontend.
- Entrées validées et normalisées côté serveur (téléphone, prix, email — cf. D3).

## D5. Stratégie de migration par chantier (où vit la compatibilité)

| Chantier | OLD | Couche de compat | NEW | Retrait legacy |
|---|---|---|---|---|
| Activité/orga | `shops.owner_id` | `shops.organization_id` nullable + backfill 1:1 | `organizations` + `organization_members` | Quand 100 % des flux écrivent l'orga (PHASE-17) |
| Équipe | `shop_members` | Miroir/vue vers `organization_members` | Permissions granulaires | Idem |
| Type métier | `shops.business_type` TEXT | `business_type_id` nullable + lecture « type effectif » | `business_types` + capabilities | Idem |
| Plans | `plans.ts` + checks TEXT + `plan_max_*` | Triggers KEEP branchés sur entitlements | Tables plans/entitlements | Idem |
| Paiement | Wave direct | Provider `TEMPORARY` derrière l'interface | Payment Engine multi-providers | Jamais sans feu vert légal/technique |
| Vitrine | jsonb sur `shops` | Contrats Section/Block sur les mêmes données | Moteur data-driven | Idem |

## D6. Dossiers `docs/*` (créés uniquement si tranchés ici)

- ✅ `docs/architecture/` (ce fichier). ⏳ `security`, `billing`, `multi-tenancy`, `page-builder`,
  `business-types`, `payments`, `economics`, `deployment` : créés dans leurs phases respectives
  (15, 10, 04, 09, 05, 11, 12, 17), pas avant — pas de doc spéculative.
- Matrice phases × dépendances : voir [PLAN.md](../refonte/PLAN.md) §3 (référence unique, pas de copie).

## D7. Points volontairement reportés (ni tranchés ni construits maintenant)

Pricing Advisor, Cost Engine complet, automatisations, providers au-delà de Wave, Page Builder
complet, `whatsapp_verifications` (vérifier si orpheline — rappel PHASE-01 §26).
