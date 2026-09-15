import { createSectionId } from './defaultLayout'
import type { LayoutSection, StoreTemplate, ThemeConfig } from '@/types/builder'

function header(overrides: Partial<Extract<LayoutSection, { type: 'header' }>['config']> = {}): LayoutSection {
  return {
    id: createSectionId('header'),
    type: 'header',
    visible: true,
    config: { showLogo: true, showCatalogLink: true, showContactLink: true, sticky: true, ...overrides },
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

// Each template mimics the visual language of a well-known category of
// e-commerce site (sportswear giants, premium tech, precision instruments,
// luxury fashion, vibrant marketplaces) — not their logos or brand names,
// just the layout/type/color instincts that make each genre recognizable at
// a glance. Every section also carries copy written for that kind of shop,
// so applying one feels like landing on a real, live store.
export const STORE_TEMPLATES: StoreTemplate[] = [
  {
    key: 'sport',
    label: 'Sport',
    description: 'Grand format, typo massive, esprit grandes marques sportives (façon Nike).',
    swatch: ['#111111', '#ff3b30'],
    themeColor: '#ff3b30',
    themeConfig: baseTheme({ secondaryColor: '#e5e5e5', textColor: '#0a0a0a', font: 'sora', textScale: 'lg', radius: 'none', contentWidth: 'wide' }),
    sections: [
      header(),
      hero({
        eyebrow: 'Édition performance',
        heading: 'Entraînez-vous sans limites',
        subheading: 'Des pièces techniques pensées pour bouger avec vous, sur et en dehors du terrain.',
      }),
      featuredProducts({ heading: 'Sélection athlètes' }),
      categories({ heading: 'Shop par sport' }),
      promo({
        heading: 'Nouvelle saison, fraîchement arrivée',
        body: 'Stocks limités sur les dernières sorties.',
        buttonLabel: 'Voir la collection',
      }),
      products({ heading: 'Tous les articles', limit: 16 }),
      footer(),
    ],
  },
  {
    key: 'studio',
    label: 'Studio',
    description: 'Ultra épuré, immense respiration, un seul produit à la fois (façon Apple).',
    swatch: ['#ffffff', '#1d1d1f'],
    themeColor: '#111111',
    themeConfig: baseTheme({ secondaryColor: '#f5f5f7', textColor: '#1d1d1f', buttonColor: '#111111', font: 'inter', textScale: 'lg', radius: 'lg', contentWidth: 'narrow' }),
    sections: [
      header({ sticky: true }),
      hero({
        eyebrow: 'Nouveau',
        heading: 'Pensé dans les moindres détails',
        subheading: 'Des produits simples à utiliser, conçus pour durer.',
      }),
      featuredProducts({ heading: 'À la une' }),
      text({
        heading: "Un design qui s'efface devant l'usage",
        body: 'Chaque produit est choisi pour sa qualité et sa simplicité — rien de superflu.',
        align: 'center',
      }),
      products({ heading: 'Tous les produits' }),
      footer({ showSocialLinks: false, showAddress: false }),
    ],
  },
  {
    key: 'precision',
    label: 'Precision',
    description: 'Grille technique, tons graphite et accent métal, esprit horloger/instruments (façon Casio).',
    swatch: ['#1f2937', '#fbbf24'],
    themeColor: '#1f2937',
    themeConfig: baseTheme({ secondaryColor: '#fbbf24', textColor: '#111827', font: 'inter', radius: 'none', contentWidth: 'normal' }),
    sections: [
      header(),
      hero({
        eyebrow: 'Précision & fiabilité',
        heading: 'Chaque détail compte',
        subheading: 'Des produits testés, garantis, pensés pour durer dans le temps.',
      }),
      products({ heading: 'Catalogue complet' }),
      featuredProducts({ heading: 'Les incontournables' }),
      text({
        heading: 'Garantie constructeur',
        body: 'Tous nos produits sont vérifiés avant expédition et couverts par une garantie.',
      }),
      footer(),
    ],
  },
  {
    key: 'editorial',
    label: 'Editorial',
    description: 'Ton magazine, couleurs riches, mise en avant produit soignée (façon maison de mode).',
    swatch: ['#7f1d1d', '#fdfbf7'],
    themeColor: '#7f1d1d',
    themeConfig: baseTheme({ secondaryColor: '#e7e0d3', textColor: '#1c1917', backgroundColor: '#fdfbf7', font: 'sora', textScale: 'lg', radius: 'none', contentWidth: 'wide' }),
    sections: [
      header(),
      hero({
        eyebrow: 'Collection capsule',
        heading: "L'élégance dans chaque détail",
        subheading: 'Pièces sélectionnées, en série limitée.',
      }),
      featuredProducts({ heading: 'En couverture' }),
      text({
        heading: 'Notre histoire',
        body: "Une sélection pensée à la main, pièce par pièce, pour celles et ceux qui veulent porter autre chose que l'ordinaire.",
      }),
      categories({ heading: 'Explorer' }),
      promo({
        heading: 'Pièces en édition limitée',
        body: 'Stock très restreint — ne repartez pas les mains vides.',
        buttonLabel: 'Découvrir',
      }),
      products({ heading: 'Toute la collection' }),
      footer(),
    ],
  },
  {
    key: 'marche',
    label: 'Marché',
    description: 'Vif, coloré, orienté bonnes affaires — esprit grande place de marché en ligne.',
    swatch: ['#f97316', '#e11d48'],
    themeColor: '#e11d48',
    themeConfig: baseTheme({ secondaryColor: '#fde68a', textColor: '#1f2937', buttonColor: '#e11d48', font: 'inter', radius: 'full', contentWidth: 'wide' }),
    sections: [
      header(),
      hero({
        eyebrow: 'Bonnes affaires du jour',
        heading: 'Tout ce qu\'il vous faut, au meilleur prix',
        subheading: 'Commandez en un clic sur WhatsApp, recevez chez vous.',
      }),
      promo({
        heading: 'Offre flash',
        body: "Jusqu'à -30% sur une sélection, aujourd'hui seulement.",
        buttonLabel: "J'en profite",
      }),
      categories({ heading: 'Toutes les catégories' }),
      products({ heading: 'Meilleures ventes', limit: 16 }),
      featuredProducts({ heading: 'Coups de cœur clients' }),
      footer(),
    ],
  },
  {
    key: 'classic',
    label: 'Classic',
    description: 'Chaleureux et complet — l\'esprit boutique de quartier, en ligne.',
    swatch: ['#9c3814', '#fbe2d3'],
    themeColor: '#9c3814',
    themeConfig: baseTheme({ secondaryColor: '#fbe2d3', radius: 'md', contentWidth: 'normal' }),
    sections: [
      header(),
      hero({
        eyebrow: 'Depuis le quartier, pour tout le monde',
        heading: 'Votre boutique de confiance',
        subheading: 'Des produits choisis avec soin, un service qui répond vraiment.',
      }),
      categories({ heading: 'Nos rayons' }),
      text({
        heading: 'Pourquoi nous choisir',
        body: 'Commande facile sur WhatsApp, paiement à la livraison, et un vendeur qui vous connaît par votre nom.',
      }),
      products({ heading: 'Nos produits' }),
      footer(),
    ],
  },
]
