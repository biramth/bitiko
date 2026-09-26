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

function featuredServices(overrides: Partial<Extract<LayoutSection, { type: 'featured_services' }>['config']> = {}): LayoutSection {
  return {
    id: createSectionId('featured_services'),
    type: 'featured_services',
    visible: true,
    config: { heading: 'Nos coups de cœur', serviceIds: [], ...overrides },
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
    variants: [
      {
        key: 'dore',
        label: 'Doré',
        description: 'Noir et or — le salon premium.',
        swatch: ['#a16207', '#1c1917'],
        themeColor: '#a16207',
        themeConfig: baseTheme({ secondaryColor: '#fef3c7', textColor: '#fafaf9', backgroundColor: '#1c1917', buttonColor: '#a16207', font: 'sora', textScale: 'lg', radius: 'full', contentWidth: 'normal' }),
      },
      {
        key: 'epure',
        label: 'Épuré',
        description: 'Blanc et rose poudré — doux et lumineux.',
        swatch: ['#be185d', '#ffffff'],
        themeColor: '#be185d',
        themeConfig: baseTheme({ secondaryColor: '#fdf2f8', textColor: '#1c1917', backgroundColor: '#ffffff', font: 'inter', textScale: 'base', radius: 'full', contentWidth: 'narrow' }),
      },
    ],
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
    key: 'barber',
    vertical: 'beaute',
    label: 'Barber',
    description: 'Sombre et masculin — coupe homme, barbe et rituels du barbier.',
    swatch: ['#1c1917', '#e7e5e4'],
    themeColor: '#1c1917',
    themeConfig: baseTheme({ secondaryColor: '#292524', textColor: '#fafaf9', backgroundColor: '#1c1917', font: 'sora', textScale: 'base', radius: 'none', contentWidth: 'normal' }),
    variants: [
      {
        key: 'cuir',
        label: 'Cuir & Laiton',
        description: 'Version claire — cuir, laiton et bois.',
        swatch: ['#92400e', '#f5f0e8'],
        themeColor: '#92400e',
        themeConfig: baseTheme({ secondaryColor: '#e7dcc8', textColor: '#1c1917', backgroundColor: '#f5f0e8', buttonColor: '#92400e', font: 'sora', textScale: 'base', radius: 'md', contentWidth: 'normal' }),
      },
      {
        key: 'bordeaux',
        label: 'Bordeaux',
        description: 'Version feutrée — rouge profond et cuir sombre.',
        swatch: ['#991b1b', '#1c1917'],
        themeColor: '#991b1b',
        themeConfig: baseTheme({ secondaryColor: '#450a0a', textColor: '#fafaf9', backgroundColor: '#1c1917', buttonColor: '#991b1b', font: 'sora', textScale: 'lg', radius: 'none', contentWidth: 'normal' }),
      },
    ],
    layout: {
      home: [
        header(),
        hero({
          eyebrow: 'Barbier',
          heading: 'La coupe au cordeau',
          subheading: 'Dégradés nets, barbe sculptée, serviette chaude.',
        }),
        services({ heading: 'Nos rituels' }),
        team({ heading: 'Nos barbiers' }),
        appointments({ heading: 'Réserver ma chaise' }),
        testimonials({ heading: 'Ils nous recommandent' }),
        footer(),
      ],
      ...systemLayout('Nos soins'),
    },
  },
  {
    key: 'institut',
    vertical: 'beaute',
    label: 'Institut & Spa',
    description: 'Doux et épuré — soins visage, corps et parenthèse détente.',
    swatch: ['#4d7c6f', '#f2f7f5'],
    themeColor: '#4d7c6f',
    themeConfig: baseTheme({ secondaryColor: '#dcebe5', textColor: '#1c2b26', backgroundColor: '#fbfdfc', buttonColor: '#4d7c6f', font: 'sora', textScale: 'base', radius: 'full', contentWidth: 'normal' }),
    variants: [
      {
        key: 'rose',
        label: 'Rose poudré',
        description: 'Version cocooning — rose tendre et blanc.',
        swatch: ['#be185d', '#fff7f9'],
        themeColor: '#be185d',
        themeConfig: baseTheme({ secondaryColor: '#fce7f3', textColor: '#3b2b33', backgroundColor: '#fff7f9', buttonColor: '#be185d', font: 'sora', textScale: 'base', radius: 'full', contentWidth: 'narrow' }),
      },
      {
        key: 'argile',
        label: 'Argile',
        description: 'Version terrienne — terracotta et crème.',
        swatch: ['#9a3412', '#fff7ed'],
        themeColor: '#9a3412',
        themeConfig: baseTheme({ secondaryColor: '#ffedd5', textColor: '#431407', backgroundColor: '#fff7ed', buttonColor: '#9a3412', font: 'inter', textScale: 'base', radius: 'lg', contentWidth: 'normal' }),
      },
    ],
    layout: {
      home: [
        header(),
        hero({
          eyebrow: 'Institut & spa',
          heading: 'Offrez-vous une parenthèse',
          subheading: 'Soins visage, massages et rituels bien-être sur mesure.',
        }),
        services({ heading: 'Nos soins' }),
        team({ heading: 'Nos expertes' }),
        appointments({ heading: 'Réserver un soin' }),
        testimonials({ heading: 'Elles nous adorent' }),
        footer(),
      ],
      ...systemLayout('Nos rituels'),
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
  {
    key: 'bistrot',
    vertical: 'restauration',
    label: 'Bistrot',
    description: 'Ardoise et craie — bistrot de quartier, ambiance feutrée.',
    swatch: ['#d97706', '#201a17'],
    themeColor: '#d97706',
    themeConfig: baseTheme({ secondaryColor: '#3a2f28', textColor: '#faf7f2', backgroundColor: '#201a17', buttonColor: '#d97706', font: 'sora', textScale: 'base', radius: 'md', contentWidth: 'normal' }),
    layout: {
      home: [
        header(),
        hero({
          eyebrow: 'Bistrot de quartier',
          heading: 'Comme à la maison, en mieux',
          subheading: 'Plats du jour à l’ardoise, vins vivants, service sourire.',
        }),
        text({
          heading: 'L’ardoise du jour',
          body: 'Chaque matin, le chef écrit la carte selon le marché. Passe nous voir ou réserve ta table.',
          align: 'center',
        }),
        menu({ heading: 'La carte' }),
        reservations({ heading: 'Réserver une table' }),
        testimonials({ heading: 'Les habitués' }),
        footer(),
      ],
      ...systemLayout('À emporter'),
    },
  },
  {
    key: 'minimal',
    vertical: 'mode',
    label: 'Minimal',
    description: 'Noir et blanc, sans détour — la mode épurée.',
    swatch: ['#111111', '#ffffff'],
    themeColor: '#111111',
    themeConfig: baseTheme({ secondaryColor: '#f5f5f5', textColor: '#111111', backgroundColor: '#ffffff', buttonColor: '#111111', font: 'inter', textScale: 'base', radius: 'none', contentWidth: 'narrow' }),
    layout: {
      home: [
        header(),
        hero({
          eyebrow: 'Nouvelle collection',
          heading: 'Moins, mais mieux',
          subheading: 'Des essentiels bien coupés, en matières durables.',
          showBanner: false,
        }),
        categories({ heading: 'Vestiaire' }),
        products({ heading: 'Les essentiels', limit: 8 }),
        text({
          heading: 'Notre engagement',
          body: 'Zéro solde, zéro gaspillage : des pièces intemporelles, produites en petites séries.',
          align: 'center',
        }),
        footer(),
      ],
      ...systemLayout('Les essentiels'),
    },
  },
  {
    key: 'onglerie',
    vertical: 'beaute',
    label: 'Onglerie',
    description: 'Bar à ongles — coloré, joyeux, poses parfaites.',
    swatch: ['#c026d3', '#fdf4ff'],
    themeColor: '#c026d3',
    themeConfig: baseTheme({ secondaryColor: '#fae8ff', textColor: '#2e1a33', backgroundColor: '#fffafd', buttonColor: '#c026d3', font: 'sora', textScale: 'base', radius: 'full', contentWidth: 'normal' }),
    layout: {
      home: [
        header(),
        hero({
          eyebrow: 'Bar à ongles',
          heading: 'Des ongles qui claquent',
          subheading: 'Manucure, nail art, poses — repars avec des mains de star.',
        }),
        featuredServices({ heading: 'Nos poses stars' }),
        services({ heading: 'La carte des soins' }),
        appointments({ heading: 'Réserver ma pose' }),
        testimonials({ heading: 'Elles adorent' }),
        footer(),
      ],
      ...systemLayout('Nos produits'),
    },
  },
  {
    key: 'primeur',
    vertical: 'epicerie',
    label: 'Primeur',
    description: 'Fruits et légumes — le marché en ligne.',
    swatch: ['#16a34a', '#f0fdf4'],
    themeColor: '#16a34a',
    themeConfig: baseTheme({ secondaryColor: '#dcfce7', textColor: '#14532d', backgroundColor: '#fdfffb', buttonColor: '#16a34a', font: 'sora', textScale: 'base', radius: 'lg', contentWidth: 'wide' }),
    layout: {
      home: [
        header(),
        hero({
          eyebrow: 'Arrivage du matin',
          heading: 'Frais du marché, livré chez toi',
          subheading: 'Fruits, légumes et crémerie, choisis à l’aube au marché.',
        }),
        promo({
          heading: 'Le panier de la semaine',
          body: 'Un assortiment de saison au meilleur prix, chaque lundi.',
          buttonLabel: 'Voir le panier',
        }),
        categories({ heading: 'L’étal' }),
        products({ heading: 'Fraîcheur du jour', limit: 16 }),
        text({
          heading: 'Nos producteurs',
          body: 'Une dizaine de fermes partenaires à moins de 50 km.',
          align: 'center',
        }),
        footer(),
      ],
      ...systemLayout('Fraîcheur du jour'),
    },
  },
  {
    key: 'repair',
    vertical: 'tech',
    label: 'Atelier Repair',
    description: 'Réparation et reconditionné — diagnostiqué, garanti.',
    swatch: ['#4338ca', '#eef2ff'],
    themeColor: '#4338ca',
    themeConfig: baseTheme({ secondaryColor: '#e0e7ff', textColor: '#1e1b4b', backgroundColor: '#fafbff', buttonColor: '#4338ca', font: 'inter', textScale: 'base', radius: 'md', contentWidth: 'normal' }),
    layout: {
      home: [
        header(),
        hero({
          eyebrow: 'Atelier de réparation',
          heading: 'Réparé, pas jeté',
          subheading: 'Diagnostic gratuit, devis en 24 h, garantie 6 mois.',
        }),
        text({
          heading: 'Comment ça marche',
          body: 'Dépose ton appareil ou envoie-le nous : diagnostic gratuit, réparation après ton accord, test complet avant restitution.',
          align: 'center',
        }),
        products({ heading: 'Reconditionnés garantis', limit: 8 }),
        categories({ heading: 'Par appareil' }),
        promo({
          heading: '-20% sur les écrans ce mois-ci',
          body: 'Écrans de smartphones remplacés par nos techniciens.',
          buttonLabel: 'En profiter',
        }),
        footer(),
      ],
      ...systemLayout('Reconditionnés garantis'),
    },
  },
  {
    key: 'scandi',
    vertical: 'deco',
    label: 'Scandinave',
    description: 'Blanc et bois clair — déco douce et lumineuse.',
    swatch: ['#8a6d3b', '#fffdf9'],
    themeColor: '#8a6d3b',
    themeConfig: baseTheme({ secondaryColor: '#f5efe4', textColor: '#292524', backgroundColor: '#fffdf9', buttonColor: '#8a6d3b', font: 'inter', textScale: 'base', radius: 'full', contentWidth: 'wide' }),
    layout: {
      home: [
        header(),
        hero({
          eyebrow: 'Esprit nordique',
          heading: 'Le calme à la maison',
          subheading: 'Bois clair, lin lavé, lumière douce : moins de bruit, plus de vie.',
        }),
        products({ heading: 'Nouveautés', limit: 12 }),
        text({
          heading: 'Nos matières',
          body: 'Chêne massif, lin européen, céramique artisanale : des matières qui vieillissent bien.',
          align: 'center',
        }),
        categories({ heading: 'Par pièce' }),
        footer(),
      ],
      ...systemLayout('Nouveautés'),
    },
  },
  {
    key: 'apothicaire',
    vertical: 'cosmetiques',
    label: 'Apothicaire',
    description: 'Remèdes et soins — herboristerie vintage.',
    swatch: ['#3f6212', '#faf6ec'],
    themeColor: '#3f6212',
    themeConfig: baseTheme({ secondaryColor: '#e9e0c8', textColor: '#292524', backgroundColor: '#faf6ec', buttonColor: '#3f6212', font: 'sora', textScale: 'base', radius: 'md', contentWidth: 'normal' }),
    layout: {
      home: [
        header(),
        hero({
          eyebrow: 'Herboristerie',
          heading: 'Les remèdes de nos grands-mères',
          subheading: 'Tisanes, huiles et soins simples, aux plantes du jardin.',
        }),
        featuredProducts({ heading: 'Remèdes phares' }),
        text({
          heading: 'Nos cueillettes',
          body: 'Plantes séchées lentement, huiles pressées à froid, savons surgras à froid.',
          align: 'center',
        }),
        categories({ heading: 'Par besoin' }),
        products({ heading: 'L’herboristerie' }),
        footer(),
      ],
      ...systemLayout('L’herboristerie'),
    },
  },
  {
    key: 'cave',
    vertical: 'epicerie_fine',
    label: 'Cave & Terroir',
    description: 'Bordeaux sombre — vins et produits du terroir.',
    swatch: ['#991b1b', '#171210'],
    themeColor: '#991b1b',
    themeConfig: baseTheme({ secondaryColor: '#3f2323', textColor: '#f5ede4', backgroundColor: '#171210', buttonColor: '#991b1b', font: 'sora', textScale: 'base', radius: 'md', contentWidth: 'normal' }),
    layout: {
      home: [
        header(),
        hero({
          eyebrow: 'Caveau',
          heading: 'Des vins qui racontent un lieu',
          subheading: 'Vignerons indépendants, vieux millésimes et accords gourmands.',
        }),
        products({ heading: 'La cave', limit: 12 }),
        text({
          heading: 'Nos accords',
          body: 'Chaque vin est goûté et accompagné de son accord fromage ou charcuterie.',
          align: 'center',
        }),
        promo({
          heading: 'Coffrets dégustation',
          body: 'Trois bouteilles, un livret, zéro faute de goût.',
          buttonLabel: 'Découvrir',
        }),
        footer(),
      ],
      ...systemLayout('La cave'),
    },
  },
  {
    key: 'jardin',
    vertical: 'fleurs_cadeaux',
    label: 'Jardin',
    description: 'Botanique — plantes, bouquets champêtres et abonnements.',
    swatch: ['#15803d', '#f7fef9'],
    themeColor: '#15803d',
    themeConfig: baseTheme({ secondaryColor: '#dcfce7', textColor: '#14532d', backgroundColor: '#f7fef9', buttonColor: '#15803d', font: 'sora', textScale: 'base', radius: 'lg', contentWidth: 'normal' }),
    layout: {
      home: [
        header(),
        hero({
          eyebrow: 'Pépinière & fleurs',
          heading: 'Fais entrer le jardin',
          subheading: 'Plantes d’intérieur increvables, bouquets champêtres, abonnements.',
        }),
        categories({ heading: 'Occasions' }),
        featuredProducts({ heading: 'Bouquets de saison' }),
        text({
          heading: 'L’abonnement fleurs',
          body: 'Un bouquet frais chaque semaine au bureau ou à la maison, sans y penser.',
          align: 'center',
        }),
        products({ heading: 'La pépinière' }),
        footer(),
      ],
      ...systemLayout('La pépinière'),
    },
  },
  {
    key: 'galerie',
    vertical: 'artisanat',
    label: 'Galerie',
    description: 'Murs blancs — l’atelier exposé comme une galerie.',
    swatch: ['#111111', '#ffffff'],
    themeColor: '#111111',
    themeConfig: baseTheme({ secondaryColor: '#f5f5f5', textColor: '#111111', backgroundColor: '#ffffff', buttonColor: '#111111', font: 'inter', textScale: 'lg', radius: 'none', contentWidth: 'wide' }),
    layout: {
      home: [
        header(),
        hero({
          eyebrow: 'Exposition en cours',
          heading: 'L’atelier s’expose',
          subheading: 'Pièces uniques présentées comme des œuvres — numérotées, signées.',
          showBanner: false,
        }),
        products({ heading: 'Œuvres disponibles', limit: 8 }),
        text({
          heading: 'L’artiste',
          body: 'Chaque pièce est numérotée, signée et accompagnée de son certificat.',
          align: 'center',
        }),
        testimonials({ heading: 'Collectionneurs' }),
        footer(),
      ],
      ...systemLayout('Œuvres disponibles'),
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