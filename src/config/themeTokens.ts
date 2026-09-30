import type { ContentWidth, FontChoice, HeadingScale, RadiusScale, SectionSpacing, ThemeConfig } from '@/types/builder'
import { readableTextOn } from '@/utils/color'

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  secondaryColor: '#f7e6d0',
  textColor: '#17152e',
  backgroundColor: '#ffffff',
  buttonColor: '',
  buttonTextColor: '#ffffff',
  secondaryButtonColor: '',
  secondaryButtonTextColor: '',
  tertiaryButtonColor: '',
  tertiaryButtonTextColor: '',
  headerBackgroundColor: '',
  headerTextColor: '',
  announcementBackgroundColor: '',
  announcementTextColor: '',
  font: 'sora-inter',
  textScale: 'base',
  headingScale: 'base',
  radius: 'none',
  contentWidth: 'normal',
  sectionSpacing: 'normal',
}

export const RADIUS_CSS: Record<RadiusScale, string> = {
  none: '0px',
  md: '0.5rem',
  lg: '1rem',
  full: '9999px',
}

const CONTENT_WIDTH_CSS: Record<ContentWidth, string> = {
  narrow: '56rem',
  normal: '72rem',
  wide: '84rem',
}

export const FONT_CSS: Record<FontChoice, { heading: string; body: string }> = {
  'sora-inter': { heading: '"Sora", "Inter", system-ui, sans-serif', body: '"Inter", system-ui, sans-serif' },
  inter: { heading: '"Inter", system-ui, sans-serif', body: '"Inter", system-ui, sans-serif' },
  sora: { heading: '"Sora", "Inter", system-ui, sans-serif', body: '"Sora", "Inter", system-ui, sans-serif' },
  system: { heading: 'system-ui, -apple-system, "Segoe UI", sans-serif', body: 'system-ui, -apple-system, "Segoe UI", sans-serif' },
  serif: { heading: 'Georgia, "Times New Roman", serif', body: 'Georgia, "Times New Roman", serif' },
}

export const FONT_LABELS: Record<FontChoice, string> = {
  'sora-inter': 'Sora + Inter (par défaut)',
  inter: 'Inter partout',
  sora: 'Sora partout',
  system: 'Système (léger, rapide)',
  serif: 'Serif (élégant)',
}

/** Builds the inline CSS custom properties a shop's theme resolves to. */
export function themeConfigToCssVars(themeColor: string, config: ThemeConfig): Record<string, string> {
  const font = FONT_CSS[config.font] ?? FONT_CSS['sora-inter']
  const textColor = config.textColor || DEFAULT_THEME_CONFIG.textColor
  const accent = themeColor || '#d9612e'
  const background = config.backgroundColor || DEFAULT_THEME_CONFIG.backgroundColor
  // Boutons et bandeau d'annonce : le texte choisi par le marchand est gardé
  // s'il contraste assez, sinon remplacé par blanc ou encre (WCAG AA 4.5:1) —
  // aucune combinaison ne peut rendre un libellé illisible.
  const button = config.buttonColor || accent
  const tertiary = config.tertiaryButtonColor || accent
  const announcementBg = config.announcementBackgroundColor || config.tertiaryButtonColor || accent
  return {
    '--shop-accent': accent,
    '--shop-secondary': config.secondaryColor || DEFAULT_THEME_CONFIG.secondaryColor,
    '--shop-text': textColor,
    '--shop-bg': background,
    // Cartes (prestations, équipe…) : un voile du texte sur le fond et un
    // filet du texte, donc lisibles aussi bien en clair qu'en thème sombre.
    '--shop-surface': `color-mix(in srgb, ${textColor} 4%, ${background})`,
    '--shop-border': `color-mix(in srgb, ${textColor} 12%, transparent)`,
    '--shop-button': button,
    '--shop-button-text': readableTextOn(button, config.buttonTextColor || '#ffffff'),
    '--shop-secondary-button': config.secondaryButtonColor || 'transparent',
    '--shop-secondary-button-text': config.secondaryButtonTextColor || textColor,
    '--shop-tertiary-button': tertiary,
    '--shop-tertiary-button-text': readableTextOn(tertiary, config.tertiaryButtonTextColor || '#ffffff'),
    '--shop-radius': RADIUS_CSS[config.radius] ?? RADIUS_CSS.none,
    '--shop-content-width': CONTENT_WIDTH_CSS[config.contentWidth] ?? CONTENT_WIDTH_CSS.normal,
    '--shop-font-heading': font.heading,
    '--shop-font-body': font.body,
    // En-tête et annonce : vides = repli boutique historique (aucun changement
    // visuel pour les shops existants tant que le marchand ne règle rien).
    '--shop-header-bg': config.headerBackgroundColor || background,
    '--shop-header-text': config.headerTextColor || textColor,
    '--shop-announcement-bg': announcementBg,
    '--shop-announcement-text': readableTextOn(announcementBg, config.announcementTextColor || config.tertiaryButtonTextColor || '#ffffff'),
    '--shop-section-gap': SECTION_SPACING_CSS[config.sectionSpacing ?? 'normal'] ?? SECTION_SPACING_CSS.normal,
  }
}

const SECTION_SPACING_CSS: Record<SectionSpacing, string> = {
  compact: '1.25rem',
  normal: '2.5rem',
  spacious: '4rem',
}

/** La taille des titres suit `headingScale` quand il est réglé, sinon
 *  `textScale` (boutiques existantes inchangées). */
export function headingScaleOf(config: ThemeConfig): HeadingScale {
  return config.headingScale ?? config.textScale ?? 'base'
}

/** Classe de titre à utiliser dans les sections (préfère le réglage dédié). */
export function sectionHeadingClass(config: ThemeConfig): string {
  return SECTION_HEADING_SCALE[headingScaleOf(config)]
}

/** Classe de titre hero (préfère le réglage dédié). */
export function heroHeadingClass(config: ThemeConfig): string {
  return HEADING_SCALE[headingScaleOf(config)]
}

/** Heading size classes per text-scale step, used by the storefront hero.
 *  Kept intentionally more compact than the theme's max so a freshly created
 *  store opens on content, not on an oversized title. */
export const HEADING_SCALE: Record<ThemeConfig['textScale'], string> = {
  sm: 'text-2xl sm:text-4xl',
  base: 'text-3xl sm:text-5xl',
  lg: 'text-3xl sm:text-5xl',
}

/** Shared heading scale for every non-hero section (Faq, Products, Categories,
 *  Promo, Text, Lookbook, FeaturedProducts…), keyed to "Taille des textes" so
 *  the setting has one real, visible, consistent effect across the storefront
 *  instead of each section carrying its own fixed size. `base` matches the
 *  size most of these sections already shipped with. */
export const SECTION_HEADING_SCALE: Record<ThemeConfig['textScale'], string> = {
  sm: 'text-lg sm:text-xl',
  base: 'text-xl sm:text-2xl',
  lg: 'text-2xl sm:text-3xl',
}
