# Bitiko — SaaS multi-boutiques

Plateforme façon Shopify pensée pour l'Afrique : n'importe quel commerçant peut créer un compte, obtenir sa boutique en ligne (catalogue, panier, commandes relayées vers WhatsApp) et la gérer depuis un dashboard — sans compte client, sans paiement en ligne compliqué, rapide même sur une connexion mobile moyenne.

**Marque** : *Bitiko*, de « bitik » — le mot wolof pour « petite boutique » (lui-même adapté du français, utilisé au quotidien au Sénégal et en Afrique de l'Ouest francophone). Identité visuelle : terracotta (`#c2481c`) comme couleur principale, indigo profond (`#221f45`) pour le texte/les surfaces sombres, or (`#f2b705`) en accent ponctuel, fond sable chaud pour le marketing. Typo : Sora (titres) + Inter (texte), auto-hébergées via `@fontsource`. Logo : [`src/components/ui/Logo.tsx`](src/components/ui/Logo.tsx) (aussi le favicon, [`public/favicon.svg`](public/favicon.svg)). Tokens de couleur/police définis dans [`src/index.css`](src/index.css).

**Stack** : React + TypeScript + Vite + Tailwind CSS v4 + React Router + TanStack Query + Supabase (Postgres, Auth, Storage, RLS). Le calcul du total et la validation du stock vivent dans une fonction Postgres appelée depuis le client — pas de serveur séparé pour ça. Une future automatisation (domaines personnalisés, facturation) passera par des **Vercel Serverless Functions** (dossier `api/`, déployées avec le frontend, sans infra à gérer) quand ce sera nécessaire.

## Modèle multi-tenant

Chaque boutique vit sur son sous-domaine gratuit `<slug>.<VITE_ROOT_DOMAIN>`, attribué à l'inscription. Le frontend résout la boutique à afficher à partir du **hostname de la requête** ([`src/lib/tenant.ts`](src/lib/tenant.ts)) :

- `tonapp.com` / `www.tonapp.com` (ou pas de `VITE_ROOT_DOMAIN` configuré) → site plateforme (landing, inscription, connexion, dashboard admin)
- `<slug>.tonapp.com` → storefront de la boutique correspondante
- tout autre hostname → résolu comme slug de boutique non enregistré (page « boutique introuvable »)

**En local**, il n'y a pas de vrai DNS wildcard : utilise `?boutique=<slug>` dans l'URL (ex. `localhost:5173/?boutique=ma-boutique`) ou la variable `VITE_DEV_SHOP_SLUG` pour prévisualiser une boutique précise ; sans ça, `localhost` est traité comme la plateforme.

## Parcours

- **Commerçant** : `/inscription` → crée son compte → `/admin/onboarding` (nom de la boutique, sous-domaine, numéro WhatsApp) → dashboard `/admin`.
- **Visiteur** : arrive sur `<slug>.tonapp.com` → catalogue → panier → checkout → commande créée en base → redirection WhatsApp.

## Architecture

```
src/
├── app/                 # App.tsx (bascule plateforme/boutique selon le hostname), StoreApp.tsx
├── routes/              # PlatformRoutes (landing/inscription/admin), StoreRoutes (storefront), gardes d'accès
├── layouts/             # StoreLayout (boutique), AdminLayout (dashboard)
├── pages/
│   ├── marketing/       # Landing page SaaS
│   ├── auth/            # Inscription
│   ├── store/           # Accueil, catalogue, produit, panier, checkout (par boutique)
│   └── admin/           # Login, onboarding, dashboard, produits, catégories, commandes, paramètres
├── features/            # Logique métier par domaine (tenant, cart, auth, products, categories, shop-settings)
├── components/ui/       # Composants génériques sans logique métier
├── services/            # Tous les appels Supabase, isolés par domaine
├── lib/                 # Client Supabase, résolution du tenant, React Query client
├── types/               # Types générés + types métier
├── config/               # Constantes (pagination, libellés de statut...)
└── utils/               # Formatage (devise, slugs)

supabase/
├── migrations/          # SQL versionné, à exécuter dans l'ordre
└── seed.example.sql     # Modèle pour créer une boutique manuellement (hors flux d'inscription)
```

## Schéma de base de données

`profiles` (1 par utilisateur Supabase Auth) → `shops` (1 propriétaire, `slug` unique pour le sous-domaine) → `categories` / `products` → `product_images`, et `orders` → `order_items`. Tout est rattaché à `shop_id` — c'est ce qui rend le multi-tenant possible sans dupliquer le schéma par boutique. Détail complet dans [`supabase/migrations/`](supabase/migrations).

Point important : `order_items` conserve `product_name` et `unit_price` au moment de la commande (snapshot), indépendamment du produit source — l'historique reste fiable même si un produit est renommé, repricé ou supprimé plus tard. Chaque commande conserve aussi la `delivery_fee` appliquée au checkout, et chaque boutique dispose de paramètres commerciaux (`delivery_fee`, `free_delivery_threshold`, `low_stock_threshold`) configurables depuis `/admin/parametres` — le seuil de stock faible pilote les alertes du dashboard et du catalogue.

## Sécurité

- **RLS activé sur toutes les tables** ([`0002_rls.sql`](supabase/migrations/0002_rls.sql)) : les visiteurs anonymes ne peuvent lire que les boutiques/catégories/produits actifs/images publiques ; toute écriture (produits, catégories, paramètres boutique) est réservée au propriétaire de la boutique concernée (`auth.uid() = shops.owner_id`) — un commerçant ne peut jamais modifier les données d'une autre boutique.
- **Aucune policy INSERT sur `orders`/`order_items`** pour `anon`/`authenticated` : la création de commande passe exclusivement par la fonction Postgres `create_order()` ([`0003_create_order_function.sql`](supabase/migrations/0003_create_order_function.sql)), en `SECURITY DEFINER`. Elle revalide le prix, le stock et le statut actif de chaque produit directement en base (jamais les valeurs envoyées par le navigateur), verrouille les lignes produits (`FOR UPDATE`) pour éviter les incohérences en cas de commandes simultanées, décrémente le stock, ajoute les frais de livraison re-validés et calcule le total avant de créer la commande.
- **Changement de statut de commande** : uniquement via la fonction `set_order_status()` ([`0006_merchant_tools.sql`](supabase/migrations/0006_merchant_tools.sql)), en `SECURITY DEFINER`. Elle re-vérifie l'appartenance de la commande à la boutique connectée, impose le workflow (`pending → confirmed → paid → delivered`, `cancelled` possible tant que la commande n'est pas terminale) et **restaure le stock** des produits quand une commande est annulée.
- **Storage** : buckets `product-images` et `shop-assets` publics en lecture, écriture/suppression réservées au propriétaire de la ressource concernée ([`0004_storage.sql`](supabase/migrations/0004_storage.sql)).
- La clé `service_role` de Supabase n'est jamais utilisée côté frontend — seule la clé publique `anon` est présente dans les variables d'environnement du client.

## Analytiques

- **Vercel Web Analytics + Speed Insights** : montés dans `src/main.tsx` (`@vercel/analytics` / `@vercel/speed-insights`), activité automatiquement visible dans le tableau de bord Vercel, sans configuration.
- **Google Analytics 4 (optionnel, par boutique)** : le storefront charge le GA4 du commerçant si `shops.ga_measurement_id` est renseigné ([`GoogleAnalytics.tsx`](src/components/GoogleAnalytics.tsx)) — fonctionnalité Pro.
- **Analytics maison (`page_views`)** : chaque vue de page (plateforme et storefronts) est enregistrée par le client dans `public.page_views` avec la clé publique ([`selfAnalytics.ts`](src/lib/selfAnalytics.ts), [`SelfAnalytics.tsx`](src/components/SelfAnalytics.tsx)). RLS : insertion libre, lecture réservée au propriétaire de la boutique. Les agrégats plateforme ne sortent que par les RPC `SECURITY DEFINER` `get_platform_stats()` / `get_platform_shops()` / `get_platform_orders()` (migration [`0033`](supabase/migrations/0033_platform_analytics.sql)), qui refusent quiconque n'est pas dans la liste d'admins. **Si vous changez l'email super-admin, mettez-le à jour à la fois dans `is_platform_admin()` (SQL) et `PLATFORM_ADMIN_EMAILS` (`api/_lib/supabaseAdmin.ts`).** Un commerçant lit ses visites/visiteurs via `get_shop_visit_stats()` (migration [`0036`](supabase/migrations/0036_shop_visit_stats.sql)).

## Prérequis

- Node.js 20+
- Un projet Supabase (gratuit) : https://supabase.com/dashboard

## Installation

```bash
npm install
cp .env.example .env
```

Renseigner dans `.env` :

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_ROOT_DOMAIN=            # laisser vide en local, ou ton domaine une fois en prod
VITE_DEV_SHOP_SLUG=          # optionnel, pour prévisualiser une boutique en local
```

Les clés Supabase se trouvent dans **Project Settings > API** du dashboard.

## Configuration Supabase

1. Créer un nouveau projet sur https://supabase.com/dashboard.
2. Dans **SQL Editor**, exécuter **tous** les fichiers de `supabase/migrations/` dans l'ordre numérique du préfixe (`0001` → `0020`, en incluant les deux `0010_*`). Le dossier fait foi — ne te fie pas à une liste figée ici, elle se périme à chaque nouvelle migration.
3. (Optionnel) Régénérer les types TypeScript depuis le schéma réel :
   ```bash
   npx supabase gen types typescript --project-id <ref> > src/types/database.types.ts
   ```

Le premier compte commerçant et sa boutique se créent ensuite directement dans l'app via `/inscription` → `/admin/onboarding` — aucune manipulation SQL manuelle requise. `supabase/seed.example.sql` reste disponible pour créer une boutique à la main si besoin (tests, import).

Si la confirmation d'email est activée sur ton projet Supabase (réglage par défaut), le commerçant doit valider son email avant que la session ne soit active — l'app l'informe et le renvoie vers `/admin/login`.

### Auth : Google et emails

- **Google (OAuth)** : activer le provider « Google » dans **Authentication → Providers** et renseigner les identifiants créés dans Google Cloud Console (Client ID + Client secret, type « Application web »). Côté Google Cloud, ajouter l'URI de redirection autorisée `https://<project-ref>.supabase.co/auth/v1/callback`.
- **URL de redirection** : dans **Authentication → URL Configuration**, ajouter à la liste autorisée chaque origine utilisée — `http://localhost:5173` en local, puis `https://<domaine>` et `https://*.<domaine>` en prod. C'est vers `<origine>/auth/callback` que reviennent Google et les liens de confirmation d'email.
- **Emails de confirmation** : ils passent par le service interne de Supabase et peuvent être lents ou atterrir en spam. Pour une livraison fiable (indispensable en prod), configurer un **SMTP personnalisé** dans **Authentication → Settings** (Resend, Mailgun, SendGrid…). En attendant, si un email n'arrive pas : vérifier les spams puis toucher « Renvoyer l'email » dans l'app.

### SEO

- **Balises par page** : `usePageSeo` (`src/hooks/usePageSeo.ts`) met à jour `title`, `description`, `canonical` (calculé depuis l'hôte courant, donc un canonical propre par sous-domaine) et Open Graph à chaque navigation ; les pages produit injectent en plus du JSON-LD Product (`src/hooks/useProductStructuredData.ts`).
- **Aperçus de liens dynamiques** : les bots de prévisualisation (WhatsApp, Facebook, X/Twitter, Telegram, Slack, LinkedIn, Discord…) n'exécutent pas de JS. Un middleware edge Vercel (`middleware.ts`) intercepte leurs requêtes sur les vraies URL de storefront — `/`, `/catalogue`, `/produits/:slug`, `/pages/:slug` — et les renvoie vers `api/og.ts`, qui construit des tags Open Graph **dynamiques par boutique/produit/page** (nom, description, image logo/bannière, prix *en cliquant sur un produit*). Les visiteurs réels et Googlebot ne passent pas par là : ils reçoivent la SPA directement, sans latence ajoutée.
- **robots.txt / sitemap.xml** : servis par une seule fonction Vercel (`api/sitemap.ts`, réécritures `/robots.txt` et `/sitemap.xml` dans `vercel.json`) pour s'adapter à l'hôte — sitemap de la plateforme sur le domaine racine (avec les pages légales), sitemap du catalogue (produits et pages custom actifs) sur chaque sous-domaine boutique. Les fonctions lisent les mêmes variables d'environnement que le frontend (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ROOT_DOMAIN` : à renseigner aussi dans les Project Settings Vercel).

## Lancer en développement

```bash
npm run dev
```

L'application refuse de démarrer sans `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` valides (échec rapide plutôt que données fictives silencieuses).

- Site plateforme (landing, inscription, connexion, dashboard) : `/`
- Prévisualiser une boutique en local : `/?boutique=<slug>` (ou `VITE_DEV_SHOP_SLUG`)

## Déploiement

**Frontend (Vercel)**

1. Pousser le dépôt sur GitHub.
2. Importer le projet dans Vercel.
3. Renseigner les variables d'environnement (voir [Variables d'environnement](#variables-denvironnement)) dans les Project Settings de Vercel. Les variables `VITE_*` sont **inlinées au build** : après les avoir modifiées, il faut **redéployer** pour qu'elles prennent effet.
4. Build command : `npm run build` — Output directory : `dist` (préréglage Vite, détecté automatiquement).
5. Pour que les sous-domaines de boutique fonctionnent, ajouter un domaine wildcard (`*.tonapp.com`) dans Vercel Domains, en plus du domaine racine, et pointer le DNS wildcard chez ton registrar vers Vercel.

**Backend (Supabase)** : déjà en production dès que le projet Supabase existe — pas de serveur à déployer séparément pour les fonctionnalités actuelles.

## Variables d'environnement

Voir [`.env.example`](.env.example). Ne jamais commiter `.env` ou `.env.local` (déjà exclus via `.gitignore`).

Deux familles de variables, à ne pas confondre :

- **Client (`VITE_*`)** — exposées dans le bundle, lisibles par n'importe qui. Uniquement `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ROOT_DOMAIN`, `VITE_DEV_SHOP_SLUG`, `VITE_GA_MEASUREMENT_ID`. À définir dans `.env` (local) **et** dans Vercel.
- **Serveur (sans préfixe)** — jamais exposées au navigateur, lues uniquement par les fonctions `api/` : `SUPABASE_SERVICE_ROLE_KEY`, `WAVE_API_KEY`, `WAVE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `CRON_SECRET`. À définir **uniquement dans Vercel** (jamais dans un fichier `.env` commité).

> La clé `service_role` bypasse les RLS : ne la mettez jamais derrière un préfixe `VITE_` et ne la commitez jamais.

### Nettoyage de la config Vercel

Si le projet Vercel contient des variables inutilisées (`NEXT_PUBLIC_*`, `SUPABASE_URL`/`SUPABASE_ANON_KEY` au format publishable, doublons), elles restent sans effet sur cette app Vite mais brouillent la lecture. Un audit se fait avec :

```bash
vercel env ls            # liste les variables et les environnements ciblés
vercel env rm SUPABASE_URL production   # supprime une variable obsolète (à répéter par environnement)
```

Vérifier aussi que `SUPABASE_SERVICE_ROLE_KEY` est bien déclarée pour **Preview** et **Production**, et, si `vercel dev` est utilisé en local, pour **Development**.

## Limite de fonctions serverless

Le plan Vercel Hobby plafonne à **12 fonctions serverless par déploiement**. Chaque fichier sous `api/` (hors `api/_lib/`, préfixe réservé aux modules partagés) et `middleware.ts` en consomme une. Le compte actuel est proche du plafond : **avant d'ajouter un handler `api/*.ts`, regrouper une logique existante** (via un paramètre `?action=` + réécriture dans `vercel.json`, comme `api/admin/payments.ts` ou `api/sitemap.ts`) plutôt que de créer un fichier de plus.

## Tester les fonctions `api/` en local

`npm run dev` ne sert **que** la SPA Vite : les routes `/api/*` répondent 404 et `middleware.ts` n'est pas exécuté. Pour tester les fonctions serverless (webhooks, cron, OG, sitemap, facturation) en local, utiliser le CLI Vercel :

```bash
vercel dev --listen 5173
```

Le CLI reste sur `5173` : c'est l'origine autorisée dans Supabase (**Authentication → URL Configuration**). Les variables serveur doivent alors être présentes dans l'environnement **Development** du projet Vercel (voir ci-dessus).

## Statuts de commande

`pending` → `confirmed` → `paid` / `cancelled` / `delivered`, modifiables depuis le dashboard (`/admin/commandes/:id`). Le workflow est imposé côté serveur par `set_order_status()` : pas de saut vers `delivered` avant confirmation, aucune modification après un statut terminal, et le stock est restitué automatiquement à l'annulation.
