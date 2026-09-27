# Templates : ajouter un style sans casser la boutique

Trois chemins, du plus simple au plus puissant. Dans tous les cas, les
pickers (Réglages, admin plateforme) suivent les **compatibilités type →
template en base** : un template n'apparaît que pour ses types mappés.

## 1. Variante de style (même template, autre look)

Le moins cher : mêmes pages et blocs, autre thème. Dans
`src/config/storeTemplates.ts`, ajoute une entrée à `variants` du template :

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

## 2. Nouveau template (code, avec déploiement)

```bash
npm run template:new -- key=mon_template vertical=beaute label="Mon template"
```

Colle l'entrée générée dans `STORE_TEMPLATES`, adapte textes/couleurs/sections
(helpers disponibles : `header`, `hero`, `products`, `services`, `team`,
`appointments`, `reservations`, `menu`, `testimonials`, `text`, `promo`,
`categories`, `featuredProducts`, `featuredServices`), puis :

1. `npm run test` — les tests valident types de sections, thème et unicité.
2. Déclare le slug en base (admin plateforme → Templates, ou migration) +
   compatibilité vers le(s) type(s) : sans mapping, le template reste invisible
   des pickers pilotés par DB. Une activité doit toujours avoir au moins un
   template qui lui appartient (`templates.owner_business_type_id`, 0140) —
   l'admin signale les activités qui n'en ont aucun.

Règles : `key` unique et immuable (minuscules, chiffres, `_`) ; ne réutilise
jamais la clé d'un template existant.

## Supprimer un template

Admin plateforme → Templates → corbeille. Garde-fous serveur :

- **En usage** (≥ 1 boutique avec ce `template_id`) : suppression **refusée
  (409)**. Passe le template en `deprecated` : il disparaît des pickers mais
  les vitrines existantes continuent de fonctionner.
- **Inutilisé** : suppression définitive (compatibilités supprimées en
  cascade). Si le slug a aussi une entrée code, c'est la version code qui
  refait foi.

## Parcours inscription

L'onboarding choisit **automatiquement** le premier template compatible avec
l'activité sélectionnée (le propre de l'activité en premier, ex. Restaurant →
Restaurant, Bistrot, puis Épicerie) — pas de choix de style à cette étape. Le
choix d'un autre template compatible depuis la personnalisation est prévu
comme chantier à part (voir PLAN.md).

## 3. Surcharge sans déploiement (admin plateforme → Templates)

Pour un besoin urgent ou une expérimentation : **Dupliquer depuis** un
template → adapte le JSON → **Valider** → Enregistrer. Le contenu invalide
est refusé côté front (fail-open : le template code reste affiché). Champs :
`themeColor`, `themeConfig`, `layout`, `variants`, et `vertical` (requis pour
un slug sans entrée code).

## Rappel d'architecture

- Le vertical n'est qu'un filtre ; un métier porte N templates, mais doit
  toujours en posséder au moins un en propre (0140).
- Une variante ne change jamais les pages, seulement le thème.
- `shop.template_id` reste toujours une clé connue (les variantes résolues
  gardent la clé de base).
