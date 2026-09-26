// Scaffolder gabarit : génère une entrée prête à coller dans
// src/config/storeTemplates.ts (tableau STORE_TEMPLATES).
//
// Usage : npm run template:new -- key=mon-gabarit vertical=beaute [label="Mon gabarit"]
//
// Règles (rappelées aussi dans docs/templates.md) :
//   - key : slug unique, minuscules/chiffres/underscores (même règle qu'en base).
//   - vertical : l'un des 10 groupes (voir src/config/verticals.ts).
//   - le rendu est validé par les tests (vitest storeTemplates) : types de
//     sections connus, theme complet, clé unique.
// Après collage : adapte textes/couleurs/sections, lance npm run test,
// puis déclare le slug en base (admin plateforme → Gabarits, ou migration)
// pour qu'il apparaisse dans les pickers pilotés par compatibilités.

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const index = arg.indexOf('=')
    return index === -1 ? [arg.replace(/^--/, ''), ''] : [arg.slice(0, index).replace(/^--/, ''), arg.slice(index + 1)]
  }),
)

const key = (args.key ?? '').trim().toLowerCase()
const vertical = (args.vertical ?? '').trim().toLowerCase()
const label = (args.label ?? '').trim() || key

if (!/^[a-z0-9]+(_[a-z0-9]+)*$/.test(key)) {
  console.error('key invalide : minuscules, chiffres, underscores (ex. key=barber_nuit).')
  process.exit(1)
}
if (!vertical) {
  console.error('vertical manquant (ex. vertical=beaute).')
  process.exit(1)
}

const entry = `  {
    key: '${key}',
    vertical: '${vertical}',
    label: '${label}',
    description: 'TODO : une phrase qui vend le style.',
    swatch: ['# be6a5c — TODO accent', '#fff7f5 — TODO fond'],
    themeColor: '#TODO',
    themeConfig: baseTheme({ secondaryColor: '#TODO', textColor: '#1c1917', backgroundColor: '#ffffff', font: 'sora', textScale: 'base', radius: 'lg', contentWidth: 'normal' }),
    layout: {
      home: [
        header(),
        hero({
          eyebrow: 'TODO',
          heading: 'TODO',
          subheading: 'TODO',
        }),
        products({ heading: 'Nos produits' }),
        testimonials({ heading: 'Ils nous recommandent' }),
        footer(),
      ],
      ...systemLayout('Nos produits'),
    },
  },`

console.log('// Colle cette entrée dans STORE_TEMPLATES (src/config/storeTemplates.ts),')
console.log('// adapte les TODO, puis lance : npm run test')
console.log(entry)
