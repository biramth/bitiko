import { createSectionId } from './defaultLayout'
import { buildDefaultSystemTemplate } from './defaultTemplates'
import { VERTICALS, type Vertical } from './verticals'
import type { LayoutSection, StoreTemplate, StoreTemplateLayout, ThemeConfig } from '@/types/builder'

function header(overrides: Partial<Extract<LayoutSection, { type: 'header' }>['config']> = {}): LayoutSection {
  return {
    id: createSectionId('header'),
    type: 'header',
    visible: true,
    config: { showLogo: true, showCatalogLink: true, showContactLink: false, sticky: true, menu: [], ...overrides },
  }
}

function footer(overrides: Partial<Extract<LayoutSection, { type: 'footer' }>['config']> = {}): LayoutSection {
  return {
    id: createSectionId('footer'),
    type: 'footer',
    visible: true,
    config: {
      showContact: true,
      showAddress: true,
      showWhatsapp: true,
      showSocialLinks: true,
      copyrightText: '',
      hideBitikoBranding: false,
      ...overrides,
    },
  }
}

function hero(overrides: Partial<Extract<LayoutSection, { type: 'hero' }>['config']> = {}): LayoutSection {
  return {
    id: createSectionId('hero'),
    type: 'hero',
    visible: true,
    config: { eyebrow: 'Boutique en ligne', heading: '', subheading: '', showBanner: true, ...overrides },
  }
}

function categories(overrides: Partial<Extract<LayoutSection, { type: 'categories' }>['config']> = {}): LayoutSection {
  return { id: createSectionId('categories'), type: 'categories', visible: true, config: { heading: 'Catégories', ...overrides } }
}

function products(overrides: Partial<Extract<LayoutSection, { type: 'products' }>['config']> = {}): LayoutSection {
  return {
    id: createSectionId('products'),
    type: 'products',
    visible: true,
    config: { heading: 'Nos produits', sort: 'recent', limit: 12, ...overrides },
  }
}

function featuredProducts(overrides: Partial<Extract<LayoutSection, { type: 'featured_products' }>['config']> = {}): LayoutSection {
  return {
    id: createSectionId('featured_products'),
    type: 'featured_products',
    visible: true,
    config: { heading: 'Notre sélection', productIds: [], ...overrides },
  }
}

function promo(overrides: Partial<Extract<LayoutSection, { type: 'promo' }>['config']> = {}): LayoutSection {
  return {
    id: createSectionId('promo'),
    type: 'promo',
    visible: true,
    config: { heading: 'Nouveautés de la saison', body: '', buttonLabel: "Voir l'offre", buttonLink: '/catalogue', backgroundColor: '', ...overrides },
  }
}

function text(overrides: Partial<Extract<LayoutSection, { type: 'text' }>['config']> = {}): LayoutSection {
  return {
    id: createSectionId('text'),
    type: 'text',
    visible: true,
    config: { heading: '', body: '', align: 'left', ...overrides },
  }
}

function services(overrides: Partial<Extract<LayoutSection, { type: 'services' }>['config']> = {}): LayoutSection {
  return {
    id: createSectionId('services'),
    type: 'services',
    visible: true,
    config: { heading: 'Nos prestations', sort: 'manual', limit: 12, ...overrides },
  }
}

function team(overrides: Partial<Extract<LayoutSection, { type: 'team' }>['config']> = {}): LayoutSection {
  return {
    id: createSectionId('team'),
    type: 'team',
    visible: true,
    config: { heading: 'Notre équipe', layout: 'grid', ...overrides },
  }
}

function appointments(overrides: Partial<Extract<LayoutSection, { type: 'appointments' }>['config']> = {}): LayoutSection {
  return {
    id: createSectionId('appointments'),
    type: 'appointments',
    visible: true,
    config: { heading: 'Réserver', showTeam: true, defaultDuration: 30, ...overrides },
  }
}

function reservations(overrides: Partial<Extract<LayoutSection, { type: 'reservations' }>['config']> = {}): LayoutSection {
  return {
    id: createSectionId('reservations'),
    type: 'reservations',
    visible: true,
    config: { heading: 'Réserver une table', showAvailability: true, ...overrides },
  }
}

function menu(overrides: Partial<Extract<LayoutSection, { type: 'menu' }>['config']> = {}): LayoutSection {
  return {
    id: createSectionId('menu'),
    type: 'menu',
    visible: true,
    config: { heading: 'Notre carte', showPrices: true, showAllergens: true, ...overrides },
  }
}

function testimonials(overrides: Partial<Extract<LayoutSection, { type: 'testimonials' }>['config']> = {}): LayoutSection {
  return {
    id: createSectionId('testimonials'),
    type: 'testimonials',
    visible: true,
    config: { heading: 'Elles parlent de nous', items: [], ...overrides },
  }
}

/** Mode-only — see templateSections.ts. Renders nothing until the merchant
 *  uploads photos, same as the Hero/Image blocks before an image exists. */
function lookbook(overrides: Partial<Extract<LayoutSection, { type: 'lookbook' }>['config']> = {}): LayoutSection {
  return {
    id: createSectionId('lookbook'),
    type: 'lookbook',
    visible: true,
    config: { heading: 'Lookbook', images: [], ...overrides },
  }
}

/** The four commerce pages all get the same sensible default body sections
 *  (catalogue grid with filters, product card, cart, checkout form); the home
 *  layout is what makes each template visually distinctive. */
function systemLayout(catalogueHeading: string): Pick<StoreTemplateLayout, 'catalogue' | 'product' | 'cart' | 'checkout'> {
  return {
    catalogue: [
      {
        id: createSectionId('products'),
        type: 'products',
        visible: true,
        config: { heading: catalogueHeading, sort: 'recent', limit: 48, enableFilters: true },
      },
    ],
    product: buildDefaultSystemTemplate('product'),
    cart: buildDefaultSystemTemplate('cart'),
    checkout: buildDefaultSystemTemplate('checkout'),
  }
}

const baseTheme = (overrides: Partial<ThemeConfig>): ThemeConfig => ({
  secondaryColor: '#f7e6d0',
  textColor: '#17152e',
  backgroundColor: '#ffffff',
  buttonColor: '',
  font: 'sora-inter',
  textScale: 'base',
  radius: 'none',
  contentWidth: 'normal',
  ...overrides,
})

/** Les gabarits prêts à l'emploi d'une boutique : quatre genres commerce
 *  (mode, épicerie, beauté, high-tech) plus deux gabarits service (coiffure,
 *  restaurant). Chaque home porte des textes écrits pour son métier, pour
 *  qu'une boutique fraîchement créée ressemble d'emblée à un vrai commerce. */
export const STORE_TEMPLATES: StoreTemplate[] = [
  {
    key: 'mode',
    vertical: 'mode',
    label: 'Mode',
    description: 'Élégant et éditorial, ton magazine — l\'esprit maison de mode.',
    swatch: ['#7f1d1d', '#fdfbf7'],
    themeColor: '#7f1d1d',
    themeConfig: baseTheme({ secondaryColor: '#e7e0d3', textColor: '#1c1917', backgroundColor: '#fdfbf7', font: 'sora', textScale: 'lg', radius: 'none', contentWidth: 'wide' }),
    layout: {
      home: [
        header(),
        hero({
          eyebrow: 'Collection capsule',
          heading: "L'élégance dans chaque détail",
          subheading: 'Pièces sélectionnées, en série limitée.',
        }),
        lookbook({ heading: 'Lookbook' }),
        featuredProducts({ heading: 'En couverture' }),
        categories({ heading: 'Explorer' }),
        promo({
          heading: 'Pièces en édition limitée',
          body: 'Stock très restreint — ne repartez pas les mains vides.',
          buttonLabel: 'Découvrir',
        }),
        products({ heading: 'Toute la collection' }),
        footer(),
      ],
      ...systemLayout('Toute la collection'),
    },
  },
  {
    key: 'epicerie',
    vertical: 'epicerie',
    label: 'Épicerie',
    description: 'Chaleureux et gourmand, l\'esprit boutique alimentaire de quartier.',
    swatch: ['#15803d', '#fef3c7'],
    themeColor: '#15803d',
    themeConfig: baseTheme({ secondaryColor: '#fef3c7', textColor: '#1f2937', buttonColor: '#15803d', font: 'sora', textScale: 'base', radius: 'lg', contentWidth: 'wide' }),
    layout: {
      home: [
        header(),
        hero({
          eyebrow: 'Produits frais et essentiels',
          heading: 'Vos courses, livrées en un clic',
          subheading: 'Commande facile sur WhatsApp, paiement à la livraison.',
        }),
        promo({
          heading: 'Promo de la semaine',
          body: "Jusqu'à -20% sur une sélection de produits frais.",
          buttonLabel: "J'en profite",
        }),
        categories({ heading: 'Nos rayons' }),
        products({ heading: 'Nos produits', limit: 16 }),
        text({
          heading: 'Pourquoi nous choisir',
          body: 'Des produits frais, choisis le matin même, et un grand choix d\'essentiels au quotidien.',
          align: 'center',
        }),
        footer(),
      ],
      ...systemLayout('Nos produits'),
    },
  },
  {
    key: 'beaute',
    vertical: 'beaute',
    label: 'Beauté',
    description: 'Doux et raffiné, tons rosés — l\'esprit boutique de cosmétiques.',
    swatch: ['#be185d', '#fdf2f8'],
    themeColor: '#be185d',
    themeConfig: baseTheme({ secondaryColor: '#fce7f3', textColor: '#1c1917', font: 'sora', textScale: 'base', radius: 'lg', contentWidth: 'normal' }),
    layout: {
      home: [
        header(),
        hero({
          eyebrow: 'Soins & cosmétiques',
          heading: 'Révélez votre éclat naturel',
          subheading: 'Une sélection beauté pensée pour toutes les peaux.',
        }),
        featuredProducts({ heading: 'Nos best-sellers' }),
        text({
          heading: 'Conseils d\'experte',
          body: 'Chaque produit est choisi pour sa qualité et testé avant d\'être proposé à la vente.',
          align: 'center',
        }),
        categories({ heading: 'Par catégorie' }),
        products({ heading: 'Toute la routine' }),
        footer(),
      ],
      ...systemLayout('Toute la routine'),
    },
  },
  {
    key: 'tech',
    vertical: 'tech',
    label: 'High-Tech',
    description: 'Net et moderne, accents bleus — l\'esprit boutique électronique.',
    swatch: ['#1d4ed8', '#f3f4f6'],
    themeColor: '#2563eb',
    themeConfig: baseTheme({ secondaryColor: '#eef2ff', textColor: '#0f172a', buttonColor: '#1d4ed8', font: 'inter', textScale: 'base', radius: 'none', contentWidth: 'wide' }),
    layout: {
      home: [
        header(),
        hero({
          eyebrow: 'Technologie & électro',
          heading: 'La tech au juste prix',
          subheading: 'Smartphones, accessoires et électroménager vérifiés, garantis.',
        }),
        products({ heading: 'Nouveautés', limit: 12 }),
        categories({ heading: 'Par marque' }),
        text({
          heading: 'Garantie & SAV',
          body: 'Tous nos produits sont testés avant expédition et couverts par une garantie constructeur.',
          align: 'center',
        }),
        promo({
          heading: 'Offres du moment',
          body: 'Des réductions exclusives sur une sélection d\'articles.',
          buttonLabel: 'Voir les offres',
        }),
        footer(),
      ],
      ...systemLayout('Nouveautés'),
    },
  },
  {
    key: 'coiffure',
    vertical: 'beaute',
    label: 'Coiffure',
    description: 'Prestations, équipe et rendez-vous — l\'esprit salon de coiffure.',
    swatch: ['#9d174d', '#fdf2f8'],
    themeColor: '#9d174d',
    themeConfig: baseTheme({ secondaryColor: '#fce7f3', textColor: '#1c1917', font: 'sora', textScale: 'base', radius: 'lg', contentWidth: 'normal' }),
    layout: {
      home: [
        header(),
        hero({
          eyebrow: 'Salon de coiffure',
          heading: 'Votre beauté entre expertes',
          subheading: 'Coupe, coloration, soins — réservez votre créneau en un clic.',
        }),
        services({ heading: 'Nos prestations' }),
        team({ heading: 'Notre équipe' }),
        appointments({ heading: 'Réserver un créneau' }),
        testimonials({ heading: 'Elles parlent de nous' }),
        footer(),
      ],
      ...systemLayout('Nos produits'),
    },
  },
  {
    key: 'restauration',
    vertical: 'restauration',
    label: 'Restaurant',
    description: 'Carte, réservation de tables et commande — l\'esprit restaurant de quartier.',
    swatch: ['#c2410c', '#fff7ed'],
    themeColor: '#c2410c',
    themeConfig: baseTheme({ secondaryColor: '#ffedd5', textColor: '#1f2937', buttonColor: '#c2410c', font: 'sora', textScale: 'base', radius: 'lg', contentWidth: 'wide' }),
    layout: {
      home: [
        header(),
        hero({
          eyebrow: 'Restaurant',
          heading: 'La table qui vous ressemble',
          subheading: 'Plats faits maison, réservation en ligne, commande à emporter.',
        }),
        menu({ heading: 'Notre carte' }),
        reservations({ heading: 'Réserver une table' }),
        products({ heading: 'À emporter', limit: 8 }),
        testimonials({ heading: 'Ils nous recommandent' }),
        footer(),
      ],
      ...systemLayout('À emporter'),
    },
  },
  {
    key: 'artisanat',
    vertical: 'artisanat',
    label: 'Artisanat',
    description: 'Chaleureux et fait-main — la vitrine des créatrices et créateurs.',
    swatch: ['#9a3412', '#fef3c7'],
    themeColor: '#9a3412',
    themeConfig: baseTheme({ secondaryColor: '#fef3c7', textColor: '#1c1917', font: 'sora', textScale: 'base', radius: 'lg', contentWidth: 'normal' }),
    layout: {
      home: [
        header(),
        hero({
          eyebrow: 'Fait main',
          heading: 'Des pièces uniques, faites avec amour',
          subheading: 'Chaque création est une pièce unique, façonnée à la main.',
        }),
        featuredProducts({ heading: "Coups de cœur d'atelier" }),
        categories({ heading: 'Univers' }),
        text({
          heading: "L'atelier",
          body: 'Derrière chaque pièce, des heures de travail et un savoir-faire artisanal.',
          align: 'center',
        }),
        products({ heading: 'Toutes les créations' }),
        footer(),
      ],
      ...systemLayout('Toutes les créations'),
    },
  },
  {
    key: 'maison',
    vertical: 'deco',
    label: 'Maison',
    description: 'Doux et inspirant — le catalogue des amoureux de déco.',
    swatch: ['#44403c', '#fafaf9'],
    themeColor: '#44403c',
    themeConfig: baseTheme({ secondaryColor: '#e7e5e4', textColor: '#1c1917', font: 'sora', textScale: 'base', radius: 'lg', contentWidth: 'wide' }),
    layout: {
      home: [
        header(),
        hero({
          eyebrow: 'Décoration & mobilier',
          heading: 'Une maison qui vous ressemble',
          subheading: 'Meubles, luminaires et objets déco sélectionnés avec goût.',
        }),
        categories({ heading: 'Par pièce' }),
        products({ heading: 'Le catalogue', limit: 16 }),
        text({
          heading: 'Conseil déco',
          body: 'Un doute sur les dimensions ou les matières ? Écrivez-nous sur WhatsApp avant de commander.',
          align: 'center',
        }),
        footer(),
      ],
      ...systemLayout('Le catalogue'),
    },
  },
  {
    key: 'cosmetiques',
    vertical: 'cosmetiques',
    label: 'Cosmétiques',
    description: 'Frais et naturel — la vitrine des soins et cosmétiques.',
    swatch: ['#0f7667', '#f0fdfa'],
    themeColor: '#0f7667',
    themeConfig: baseTheme({ secondaryColor: '#ccfbf1', textColor: '#1c1917', font: 'sora', textScale: 'base', radius: 'lg', contentWidth: 'normal' }),
    layout: {
      home: [
        header(),
        hero({
          eyebrow: 'Soins & cosmétiques',
          heading: 'Le soin au naturel',
          subheading: 'Des formules propres, testées et pensées pour votre peau.',
        }),
        featuredProducts({ heading: 'Nos best-sellers' }),
        categories({ heading: 'Par besoin' }),
        text({
          heading: 'Formules propres',
          body: 'Ingrédients naturels, sans compromis sur l’efficacité.',
          align: 'center',
        }),
        products({ heading: 'Toute la routine' }),
        footer(),
      ],
      ...systemLayout('Toute la routine'),
    },
  },
  {
    key: 'epicerie_fine',
    vertical: 'epicerie_fine',
    label: 'Épicerie fine',
    description: 'Gourmand et terroir — les meilleurs produits locaux et artisanaux.',
    swatch: ['#b45309', '#fffbeb'],
    themeColor: '#b45309',
    themeConfig: baseTheme({ secondaryColor: '#fef3c7', textColor: '#1c1917', buttonColor: '#b45309', font: 'sora', textScale: 'base', radius: 'lg', contentWidth: 'wide' }),
    layout: {
      home: [
        header(),
        hero({
          eyebrow: 'Produits fins et locaux',
          heading: 'Le goût du terroir',
          subheading: 'Chocolats, épices, produits artisanaux — le meilleur du local.',
        }),
        promo({
          heading: 'Sélection gourmande',
          body: 'Nos coups de cœur du moment, en quantité limitée.',
          buttonLabel: "J'en profite",
        }),
        categories({ heading: 'Nos rayons fins' }),
        products({ heading: 'Nos produits', limit: 16 }),
        footer(),
      ],
      ...systemLayout('Nos produits'),
    },
  },
  {
    key: 'fleurs_cadeaux',
    vertical: 'fleurs_cadeaux',
    label: 'Fleurs & Cadeaux',
    description: 'Floral et délicat — bouquets, coffrets et attentions.',
    swatch: ['#a21caf', '#fdf4ff'],
    themeColor: '#a21caf',
    themeConfig: baseTheme({ secondaryColor: '#fae8ff', textColor: '#1c1917', font: 'sora', textScale: 'base', radius: 'lg', contentWidth: 'normal' }),
    layout: {
      home: [
        header(),
        hero({
          eyebrow: 'Fleuriste',
          heading: 'Des fleurs pour chaque moment',
          subheading: 'Bouquets du jour, abonnements et créations sur mesure.',
        }),
        featuredProducts({ heading: 'Bouquets du moment' }),
        categories({ heading: 'Occasions' }),
        text({
          heading: 'Livraison soignée',
          body: 'Commandez avant midi pour une livraison le jour même en ville.',
          align: 'center',
        }),
        products({ heading: 'Toutes nos créations' }),
        footer(),
      ],
      ...systemLayout('Toutes nos créations'),
    },
  },
]

/** Lookup by `template_id`. A shop stores its chosen genre's key here; the
 *  palettes used for the free-plan category colors are read from it. */
export const STORE_TEMPLATE_BY_KEY: Record<string, StoreTemplate> = Object.fromEntries(
  STORE_TEMPLATES.map((template) => [template.key, template]),
)

/** Templates a merchant can browse for a given vertical (their shop's
 *  `business_type`). `null`/unknown vertical returns every template — the
 *  safe fallback for shops that predate the vertical field, so they never
 *  see an empty template library. Business-type slugs (coiffure, restauration…)
 *  resolve through their vertical, with an exact key match first so a coiffeur
 *  is offered the Coiffure template before Beauté. */
export function templatesForVertical(vertical: string | null | undefined): StoreTemplate[] {
  if (!vertical) return STORE_TEMPLATES
  const verticalKey = BUSINESS_TYPE_VERTICAL[vertical] ?? vertical
  const matches = STORE_TEMPLATES.filter((template) => template.vertical === verticalKey)
  if (matches.length === 0) return STORE_TEMPLATES
  const exact = matches.filter((template) => template.key === vertical)
  return [...exact, ...matches.filter((template) => template.key !== vertical)]
}

/** Verticals with at least one template — the only ones ever shown to a
 *  merchant (onboarding, Réglages). */
export function availableVerticals(): Vertical[] {
  const verticalsInUse = new Set(STORE_TEMPLATES.map((template) => template.vertical))
  return VERTICALS.filter((vertical) => verticalsInUse.has(vertical.key))
}

/** Business-type slugs (DB referential, voir migration 0116) résolus vers le
 *  vertical de leurs gabarits. La plupart des slugs sont déjà des verticals ;
 *  seuls les types historiques hors des 10 groupes ont besoin d'un alias. */
const BUSINESS_TYPE_VERTICAL: Record<string, string> = {
  food_services: 'epicerie',
  coiffure: 'beaute',
  librairie: 'epicerie',
}