import type { ContentWidth, FontChoice, RadiusScale, ThemeConfig } from '@/types/builder'

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
  font: 'sora-inter',
  textScale: 'base',
  radius: 'none',
  contentWidth: 'normal',
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
}

/** Builds the inline CSS custom properties a shop's theme resolves to. */
export function themeConfigToCssVars(themeColor: string, config: ThemeConfig): Record<string, string> {
  const font = FONT_CSS[config.font] ?? FONT_CSS['sora-inter']
  const textColor = config.textColor || DEFAULT_THEME_CONFIG.textColor
  const accent = themeColor || '#d9612e'
  return {
    '--shop-accent': accent,
    '--shop-secondary': config.secondaryColor || DEFAULT_THEME_CONFIG.secondaryColor,
    '--shop-text': textColor,
    '--shop-bg': config.backgroundColor || DEFAULT_THEME_CONFIG.backgroundColor,
    '--shop-button': config.buttonColor || accent,
    '--shop-button-text': config.buttonTextColor || '#ffffff',
    '--shop-secondary-button': config.secondaryButtonColor || 'transparent',
    '--shop-secondary-button-text': config.secondaryButtonTextColor || textColor,
    '--shop-tertiary-button': config.tertiaryButtonColor || accent,
    '--shop-tertiary-button-text': config.tertiaryButtonTextColor || '#ffffff',
    '--shop-radius': RADIUS_CSS[config.radius] ?? RADIUS_CSS.none,
    '--shop-content-width': CONTENT_WIDTH_CSS[config.contentWidth] ?? CONTENT_WIDTH_CSS.normal,
    '--shop-font-heading': font.heading,
    '--shop-font-body': font.body,
  }
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
