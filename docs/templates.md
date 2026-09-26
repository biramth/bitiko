# Gabarits : ajouter un style sans casser la boutique

Trois chemins, du plus simple au plus puissant. Dans tous les cas, les
pickers (onboarding, onglet Styles, Réglages) suivent les **compatibilités
type → gabarit en base** : un gabarit n'apparaît que pour ses types mappés.

## 1. Variante de style (même gabarit, autre look)

Le moins cher : mêmes pages et blocs, autre thème. Dans
`src/config/storeTemplates.ts`, ajoute une entrée à `variants` du gabarit :

```ts
variants: [
  {
    key: 'nuit',
    label: 'Nuit',
    description: 'Version sombre.',
    swatch: ['#accent', '#fond'],
    themeColor: '#accent',
    themeConfig: baseTheme({ secondaryColor: '#…', textColor: '#…', backgroundColor: '#…', font: 'sora', textScale: 'base', radius: 'lg', contentWidth: 'normal' }),
  },
]
```

Zéro migration, zéro API : l'onglet Styles affiche la pastille et la preview
est immédiate. Exemples : Barber (Cuir & Laiton, Bordeaux).

## 2. Nouveau gabarit (code, avec déploiement)

```bash
npm run template:new -- key=mon_gabarit vertical=beaute label="Mon gabarit"
```

Colle l'entrée générée dans `STORE_TEMPLATES`, adapte textes/couleurs/sections
(helpers disponibles : `header`, `hero`, `products`, `services`, `team`,
`appointments`, `reservations`, `menu`, `testimonials`, `text`, `promo`,
`categories`, `featuredProducts`, `featuredServices`), puis :

1. `npm run test` — les tests valident types de sections, thème et unicité.
2. Déclare le slug en base (admin plateforme → Gabarits, ou migration) +
   compatibilité vers le(s) type(s) : sans mapping, le gabarit reste invisible
   des pickers pilotés par DB.

Règles : `key` unique et immuable (minuscules, chiffres, `_`) ; ne réutilise
jamais la clé d'un gabarit existant ; un gabarit ne se supprime pas, il passe
en `deprecated`.

## 3. Surcharge sans déploiement (admin plateforme → Gabarits)

Pour un besoin urgent ou une expérimentation : **Dupliquer depuis** un gabarit
→ adapte le JSON → **Valider** → Enregistrer. Le contenu invalide est refusé
côté front (fail-open : le gabarit code reste affiché). Champs : `themeColor`,
`themeConfig`, `layout`, `variants`, et `vertical` (requis pour un slug sans
entrée code).

## Rappel d'architecture

- Le vertical n'est qu'un filtre ; un métier porte N gabarits.
- Une variante ne change jamais les pages, seulement le thème.
- `shop.template_id` reste toujours une clé connue (les variantes résolues
  gardent la clé de base).
