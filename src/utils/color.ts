import { contrastWithWhite } from './format'

/** Hex color math used to turn a logo's palette into a readable brand theme.
 *  The logo's accent is used as-is whenever it already passes the contrast bar
 *  for white text (buttons, tiles); light accents are darkened toward black
 *  until they do, and the secondary color is lightened into a soft tint so
 *  dark text stays readable on top of it. */

export function hexChannels(hex: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!match) return null
  return [
    parseInt(match[1].slice(0, 2), 16),
    parseInt(match[1].slice(2, 4), 16),
    parseInt(match[1].slice(4, 6), 16),
  ]
}

/** Parses a `#RRGGBB` or `#RRGGBBAA` color (the 8-digit form carries its own
 *  alpha between `00` — fully transparent — and `ff` — fully opaque). */
export function hexWithAlpha(hex: string): { channels: [number, number, number]; alpha: number } | null {
  const match = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex)
  if (!match) return null
  const channels = hexChannels(`#${match[1]}`)
  if (!channels) return null
  const alpha = match[2] != null ? parseInt(match[2], 16) / 255 : 1
  return { channels, alpha }
}

/** The alpha of a color as a 0–1 float; `#RRGGBB` (and auto/empty) = 1. */
export function alphaOf(hex: string): number {
  return hexWithAlpha(hex)?.alpha ?? 1
}

/** True when the color is explicitly fully transparent (`#RRGGBB00`). */
export function isFullyTransparent(hex: string): boolean {
  const parsed = hexWithAlpha(hex)
  return parsed != null && parsed.alpha === 0
}

/** The 6-digit `#RRGGBB` of a color, alpha dropped; falls back to `hex` when
 *  the input isn't a color at all. */
export function baseOf(hex: string): string {
  const parsed = hexWithAlpha(hex)
  return parsed ? `#${hex.slice(1, 7)}` : hex
}

export function hexToRgba(hex: string): string {
  const parsed = hexWithAlpha(hex)
  if (!parsed) return 'transparent'
  const [r, g, b] = parsed.channels
  return `rgba(${r}, ${g}, ${b}, ${parsed.alpha.toFixed(3)})`
}

/** Adds (or replaces) the alpha on a color, returning `#RRGGBBAA` while the
 *  alpha is below `ff` and plain `#RRGGBB` when it's fully opaque. */
export function hexWithNewAlpha(hex: string, alpha: number): string {
  const base = baseOf(hex)
  const clamped = Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : 1
  if (clamped >= 1) return base
  const hexAlpha = Math.round(clamped * 255).toString(16).padStart(2, '0')
  return `${base}${hexAlpha}`
}

/** Composites a possibly-transparent color over a solid backdrop and returns
 *  the resulting opaque color (`backdrop` defaults to white). Handy for
 *  previews and contrast checks against a known background. */
export function compositeHex(hex: string, backdrop: string = '#ffffff'): string {
  const parsed = hexWithAlpha(hex)
  const back = hexWithAlpha(backdrop)
  if (!parsed || !back) return hex
  const a = parsed.alpha
  const mix = (c: number, d: number) => Math.round(c * a + d * (1 - a))
  const [r, g, b] = [
    mix(parsed.channels[0], back.channels[0]),
    mix(parsed.channels[1], back.channels[1]),
    mix(parsed.channels[2], back.channels[2]),
  ]
  return toHexColor(r, g, b)
}

export function toHexColor(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((c) => Math.max(0, Math.min(255, Math.round(c))))
    .map((c) => c.toString(16).padStart(2, '0'))
    .join('')}`
}

/** Linear blend of two hex colors: `ratio` of `into` mixed into `from` (0–1). */
export function mixHex(from: string, into: string, ratio: number): string {
  const a = hexChannels(from)
  const b = hexChannels(into)
  if (!a || !b) return from
  const r = a[0] + (b[0] - a[0]) * ratio
  const g = a[1] + (b[1] - a[1]) * ratio
  const bl = a[2] + (b[2] - a[2]) * ratio
  return toHexColor(r, g, bl)
}

/** Lightens a color toward white until it becomes a soft pastel tint (dark
 *  text stays comfortably readable on top of it, contrast ≈ 14:1 or better). */
export function softTint(hex: string, intoWhite = 0.8): string {
  let tint = hex
  const channels = hexChannels(tint)
  if (!channels) return hex
  tint = mixHex(hex, '#ffffff', intoWhite)
  let guard = 0
  // A tint whose white-contrast is still high (= it isn't light enough yet)
  // needs to be pushed further toward white.
  while (contrastWithWhite(tint) >= 1.3 && guard < 10) {
    tint = mixHex(tint, '#ffffff', 0.2)
    guard += 1
  }
  return tint
}

/** Darkens an accent color until white text on it clears `minRatio` (WCAG AA
 *  for normal text = 4.5:1). Buttons, category tiles and accents all put white
 *  text on this color, so a light logo color must be deepened to stay usable —
 *  the hue is preserved, only the value drops. */
export function ensureReadableAccent(hex: string, minRatio: number = 4.5): string {
  let accent = hex
  const channels = hexChannels(accent)
  if (!channels) return hex
  let guard = 0
  while (contrastWithWhite(accent) < minRatio && guard < 10) {
    accent = mixHex(accent, '#000000', 0.15)
    guard += 1
  }
  return accent
}