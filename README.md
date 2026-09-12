# Boutique en ligne

Boutique e-commerce mono-vendeur : catalogue public, panier client (localStorage), commande relayée vers WhatsApp, et dashboard admin pour gérer produits, catégories, commandes et paramètres.

**Stack** : React + TypeScript + Vite + Tailwind CSS v4 + React Router + TanStack Query + Supabase (Postgres, Auth, Storage, RLS). Aucun backend séparé : toute la logique serveur (calcul du total, validation du stock) vit dans une fonction Postgres appelée depuis le client.

## Architecture

```
src/
├── app/                 # Composition racine (App.tsx)
├── routes/              # Découpage des routes publiques/admin + garde d'accès
├── layouts/             # StoreLayout (boutique), AdminLayout (dashboard)
├── pages/
│   ├── store/           # Accueil, catalogue, produit, panier, checkout
│   └── admin/           # Login, dashboard, produits, catégories, commandes, paramètres
├── features/            # Logique métier par domaine (cart, auth, products, categories, shop-settings)
├── components/ui/       # Composants génériques sans logique métier
├── services/            # Tous les appels Supabase, isolés par domaine
├── lib/                 # Client Supabase, React Query client
├── types/               # Types générés + types métier
├── config/               # Constantes (pagination, libellés de statut...)
└── utils/               # Formatage (devise, slugs)

supabase/
├── migrations/          # SQL versionné, à exécuter dans l'ordre
└── seed.example.sql     # Modèle pour créer le premier compte admin + la boutique
```

## Schéma de base de données

`profiles` → `shops` (1 propriétaire) → `categories` / `products` → `product_images`, et `orders` → `order_items`. Tout est rattaché à `shop_id` dès le départ pour permettre une évolution multi-boutique future sans migration de schéma lourde. Le détail complet (colonnes, contraintes, index) est dans [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).

Point important : `order_items` conserve `product_name` et `unit_price` au moment de la commande (snapshot), indépendamment du produit source — l'historique des commandes reste donc fiable même si un produit est renommé, repricé ou supprimé plus tard.

## Sécurité

- **RLS activé sur toutes les tables** ([`0002_rls.sql`](supabase/migrations/0002_rls.sql)) : les visiteurs anonymes ne peuvent lire que les boutiques/catégories/produits actifs/images publiques ; toute écriture (produits, catégories, paramètres boutique) est réservée au propriétaire (`auth.uid() = shops.owner_id`).
- **Aucune policy INSERT sur `orders`/`order_items`** pour `anon`/`authenticated` : la création de commande passe exclusivement par la fonction Postgres `create_order()` ([`0003_create_order_function.sql`](supabase/migrations/0003_create_order_function.sql)), en `SECURITY DEFINER`. Cette fonction revalide le prix, le stock et le statut actif de chaque produit directement en base (jamais les valeurs envoyées par le navigateur), verrouille les lignes produits (`FOR UPDATE`) pour éviter les incohérences en cas de commandes simultanées, décrémente le stock et calcule le total avant de créer la commande.
- **Storage** : buckets `product-images` et `shop-assets` publics en lecture, écriture/suppression réservées au propriétaire de la ressource concernée ([`0004_storage.sql`](supabase/migrations/0004_storage.sql)).
- La clé `service_role` de Supabase n'est jamais utilisée côté frontend — seule la clé publique `anon` est présente dans les variables d'environnement du client.

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
```

Ces valeurs se trouvent dans **Project Settings > API** du dashboard Supabase.

## Configuration Supabase

1. Créer un nouveau projet sur https://supabase.com/dashboard.
2. Dans **SQL Editor**, exécuter dans l'ordre les fichiers de `supabase/migrations/` :
   - `0001_init.sql`
   - `0002_rls.sql`
   - `0003_create_order_function.sql`
   - `0004_storage.sql`
3. Créer le compte administrateur : **Authentication > Users > Add user** (email + mot de passe).
4. Copier l'UUID de cet utilisateur, dupliquer `supabase/seed.example.sql` en remplaçant `YOUR-AUTH-USER-UUID`, puis l'exécuter dans le SQL Editor. Cela crée le profil `owner` et la boutique.
5. (Optionnel) Régénérer les types TypeScript depuis le schéma réel :
   ```bash
   npx supabase gen types typescript --project-id <ref> > src/types/database.types.ts
   ```

## Lancer en développement

```bash
npm run dev
```

L'application refuse de démarrer sans `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` valides (échec rapide plutôt que données fictives silencieuses).

- Boutique publique : `/`
- Connexion admin : `/admin/login`

## Déploiement

**Frontend (Vercel)**

1. Pousser le dépôt sur GitHub.
2. Importer le projet dans Vercel.
3. Renseigner les variables d'environnement `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans les Project Settings de Vercel.
4. Build command : `npm run build` — Output directory : `dist` (détecté automatiquement, préréglage Vite).

**Backend (Supabase)** : déjà en production dès que le projet Supabase existe — pas de serveur à déployer séparément.

## Variables d'environnement

Voir [`.env.example`](.env.example). Ne jamais commiter `.env` ou `.env.local` (déjà exclus via `.gitignore`).

## Statuts de commande

`pending` → `confirmed` → `paid` / `cancelled` / `delivered`, modifiables depuis le dashboard (`/admin/commandes/:id`).
