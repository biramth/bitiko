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

/** The four commerce genre templates a shop can be created with. Named after
 *  the vertical they mimic (fashion, grocery, beauty, electronics) — not a
 *  specific brand. Each home layout carries copy written for that kind of
 *  shop, so a freshly created store feels like a real, live boutique. */
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
]

/** Lookup by `template_id`. A shop stores its chosen genre's key here; the
 *  palettes used for the free-plan category colors are read from it. */
export const STORE_TEMPLATE_BY_KEY: Record<string, StoreTemplate> = Object.fromEntries(
  STORE_TEMPLATES.map((template) => [template.key, template]),
)

/** Templates a merchant can browse for a given vertical (their shop's
 *  `business_type`). `null`/unknown vertical returns every template — the
 *  safe fallback for shops that predate the vertical field, so they never
 *  see an empty template library. */
export function templatesForVertical(vertical: string | null | undefined): StoreTemplate[] {
  if (!vertical) return STORE_TEMPLATES
  const matches = STORE_TEMPLATES.filter((template) => template.vertical === vertical)
  return matches.length > 0 ? matches : STORE_TEMPLATES
}

/** Verticals with at least one template — the only ones ever shown to a
 *  merchant (onboarding, Réglages). */
export function availableVerticals(): Vertical[] {
  const verticalsInUse = new Set(STORE_TEMPLATES.map((template) => template.vertical))
  return VERTICALS.filter((vertical) => verticalsInUse.has(vertical.key))
}