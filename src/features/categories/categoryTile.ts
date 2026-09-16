import { DEFAULT_THEME_CONFIG } from '@/config/themeTokens'
import { STORE_TEMPLATE_BY_KEY } from '@/config/storeTemplates'
import type { Shop } from '@/types'

/** Preset tile background colors for categories (stored as the raw hex in categories.color). */
export const CATEGORY_TILE_COLORS = [
  '#1C1917',
  '#7C3AED',
  '#2563EB',
  '#059669',
  '#DB2777',
  '#EA580C',
  '#B45309',
  '#0F766E',
] as const

/** The 3 allowed tile colors on the free plan, read from the shop's chosen
 *  genre template — its accent, secondary and body-text colors. When the shop
 *  predates templates, it falls back to what its own theme renders. */
export function themeTileColors(
  shop?: Pick<Shop, 'template_id' | 'theme_color' | 'theme_config'> | null,
): string[] {
  if (shop?.template_id) {
    const template = STORE_TEMPLATE_BY_KEY[shop.template_id]
    if (template) return [template.themeColor, template.themeConfig.secondaryColor, template.themeConfig.textColor]
  }
  return [
    shop?.theme_color?.trim() || '#d9612e',
    shop?.theme_config?.secondaryColor?.trim() || DEFAULT_THEME_CONFIG.secondaryColor,
    shop?.theme_config?.textColor?.trim() || DEFAULT_THEME_CONFIG.textColor,
  ]
}

/** Rough text color for a given hex background, based on perceived luminance. */
export function readableTextColor(hex: string): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return '#FFFFFF'
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.62 ? '#1C1917' : '#FFFFFF'
}