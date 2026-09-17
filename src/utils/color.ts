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