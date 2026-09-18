import type { CSSProperties } from 'react'
import type { TextStyleOverride, TextWeight } from '@/types/builder'
import { FONT_CSS } from './themeTokens'

const WEIGHT_CSS: Record<TextWeight, number> = { normal: 400, medium: 500, semibold: 600, bold: 700 }

/** Turns a per-text override into inline styles. Only the fields that are
 *  actually set are returned (never `undefined` keys): callers spread this over
 *  a base style like `{ fontFamily: 'var(--shop-font-heading)' }`, and an
 *  explicit `undefined` would wipe the theme's own value instead of inheriting it. */
export function resolveTextStyle(override?: TextStyleOverride): CSSProperties {
  const style: CSSProperties = {}
  if (!override) return style
  if (override.color) style.color = override.color
  if (override.font) style.fontFamily = FONT_CSS[override.font].heading
  if (override.weight) style.fontWeight = WEIGHT_CSS[override.weight]
  if (override.italic) style.fontStyle = 'italic'
  return style
}

/** True when the override changes anything — used to show an "active" dot on
 *  the style trigger. */
export function hasTextStyle(override?: TextStyleOverride): boolean {
  return !!override && Object.values(override).some((v) => v !== undefined && v !== '' && v !== false)
}
