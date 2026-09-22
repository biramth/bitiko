# Bitiko — guide opérationnel

SaaS multi-boutiques pour l'Afrique de l'Ouest : React + TypeScript + Vite + Tailwind + Supabase (Postgres, Auth, Storage, RLS). Chaque boutique vit sur `<slug>.<VITE_ROOT_DOMAIN>` ; la plateforme (landing, inscription, dashboard) sur la racine. Détails produit/archi : [README.md](./README.md).

## Branches & déploiement Vercel

- **`main`** → **Production** Vercel + base Supabase **prod** (ref `jebmorovxoxecgixievu`).
- **`develop`** → **Preview** Vercel (auto-deploy à chaque push) + base Supabase **dev** (ref `tlqgcmbdethmhqrablcy`).
- Les bases dev/prod sont **strictement séparées**. Une clé ou une env du mauvais environnement = données aplatées au mauvais endroit.
- Les variables `VITE_*` sont **inlinées au build** : après modification des variables Vercel, un **Redeploy** est nécessaire.
- La preview est **protégée par défaut** (mur de login Vercel) : seuls les comptes Vercel autorisés y accèdent.

## Serveur de dev local

```bash
npm run dev                 # Vite sur http://localhost:5173 (HMR, SPA seule)
vercel dev --listen 3001    # dans un 2e terminal : exécute les fonctions /api/*
```

- `npm run dev` seul renvoie **404 sur `/api/*`** : ce sont des fonctions serverless (dossier `api/`).
- `vite.config.ts` proxifie `/api` → `http://localhost:3001` ; le proxy ne marche donc qu'avec `vercel dev --listen 3001` lancé en parallèle.
- `vercel dev` exige le CLI Vercel et les variables **Development** du projet dans Vercel (dont `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `WAVE_API_KEY`…).
- Prévisualiser une boutique sans vrai DNS wildcard : `/?boutique=<slug>` (ou `VITE_DEV_SHOP_SLUG`).

## Preview Vercel

- Pousser sur `develop` → déploiement preview automatique, URL de la forme `bitiko-git-develop-biramths-projects.vercel.app` (plus une URL unique par déploiement).
- La preview tourne contre la **base dev** (env Preview Vercel), la prod contre la **base prod** (env Production Vercel).
- Après changement de variables Vercel : **Redeploy** (les `VITE_*` sont inlinées au build).

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur Vite local (HMR) |
| `npm run build` | `tsc -b && vite build` |
| `npm run lint` | oxlint |
| `npm run test` | vitest run |
| `npx tsc -b` | Typecheck seul |

## Migrations Supabase

- Migrations versionnées dans `supabase/migrations/` (ordre numérique du préfixe).
- À appliquer **séparément par environnement** (`npx supabase db push --project-ref <ref dev ou prod>`), jamais aux deux d'un coup sans validation.
- RLS sous-tend la sécurité : toute écriture se fait via policies/fonctions `SECURITY DEFINER` ; `SUPABASE_SERVICE_ROLE_KEY` reste côté serveur et ne doit jamais porter le préfixe `VITE_`.

## Conventions

- Doc et commentaires en français ; le code suit les conventions existantes.
- Jamais de clé/secret commité (`service_role`, clés API, `.env*`).
- Ne pas ajouter de commentaires de code non nécessaires.