import type { ContentWidth, FontChoice, RadiusScale, ThemeConfig } from '@/types/builder'

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  secondaryColor: '#f7e6d0',
  textColor: '#17152e',
  backgroundColor: '#ffffff',
  buttonColor: '',
  font: 'sora-inter',
  textScale: 'base',
  radius: 'none',
  contentWidth: 'normal',
}

const RADIUS_CSS: Record<RadiusScale, string> = {
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

const FONT_CSS: Record<FontChoice, { heading: string; body: string }> = {
  'sora-inter': { heading: '"Sora", "Inter", system-ui, sans-serif', body: '"Inter", system-ui, sans-serif' },
  inter: { heading: '"Inter", system-ui, sans-serif', body: '"Inter", system-ui, sans-serif' },
  sora: { heading: '"Sora", "Inter", system-ui, sans-serif', body: '"Sora", "Inter", system-ui, sans-serif' },
}

/** Builds the inline CSS custom properties a shop's theme resolves to. */
export function themeConfigToCssVars(themeColor: string, config: ThemeConfig): Record<string, string> {
  const font = FONT_CSS[config.font] ?? FONT_CSS['sora-inter']
  return {
    '--shop-accent': themeColor || '#d9612e',
    '--shop-secondary': config.secondaryColor || DEFAULT_THEME_CONFIG.secondaryColor,
    '--shop-text': config.textColor || DEFAULT_THEME_CONFIG.textColor,
    '--shop-bg': config.backgroundColor || DEFAULT_THEME_CONFIG.backgroundColor,
    '--shop-button': config.buttonColor || themeColor || '#d9612e',
    '--shop-radius': RADIUS_CSS[config.radius] ?? RADIUS_CSS.none,
    '--shop-content-width': CONTENT_WIDTH_CSS[config.contentWidth] ?? CONTENT_WIDTH_CSS.normal,
    '--shop-font-heading': font.heading,
    '--shop-font-body': font.body,
  }
}

/** Heading size classes per text-scale step, used by section renderers. */
export const HEADING_SCALE: Record<ThemeConfig['textScale'], string> = {
  sm: 'text-3xl sm:text-4xl',
  base: 'text-4xl sm:text-6xl',
  lg: 'text-5xl sm:text-7xl',
}

export const SECTION_HEADING_SCALE: Record<ThemeConfig['textScale'], string> = {
  sm: 'text-base',
  base: 'text-lg',
  lg: 'text-xl',
}
