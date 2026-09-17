/**
 * Suggests a brand palette from a shop's logo — a primary accent (so a
 * red-and-gold logo gives a red-and-gold storefront instead of a generic
 * template color) plus, when present, a second distinct hue to soften
 * backgrounds with. Always a starting point: the merchant can still change
 * the colors by hand afterward.
 */

interface ColorBucket {
  r: number
  g: number
  b: number
  count: number
  saturation: number
  hue: number
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`
}

/** Standard HSL saturation/lightness/hue from 0–255 RGB channels. */
function hslOf(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l }
  const s = d / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === rn) h = ((gn - bn) / d) % 6
  else if (max === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4
  h = h * 60
  if (h < 0) h += 360
  return { h, s, l }
}

/** Shortest angle between two hue degrees (0–360). */
function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b)
  return Math.min(diff, 360 - diff)
}

/** Scores a bucket: common AND saturated, so a small vivid logomark wins over
 *  a larger but dull area. */
function bucketScore(bucket: ColorBucket): number {
  const avgSaturation = bucket.saturation / bucket.count
  return bucket.count * (0.5 + avgSaturation)
}

/** Buckets raw RGBA pixel data into coarse color groups, skipping background/
 *  text pixels (near-white, near-black, or gray). Returns buckets sorted by
 *  score, best first — empty when nothing distinctive is left. */
function scoreBuckets(pixels: Uint8ClampedArray): ColorBucket[] {
  const BUCKET_STEP = 24
  const buckets = new Map<string, ColorBucket>()

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]
    const g = pixels[i + 1]
    const b = pixels[i + 2]
    const a = pixels[i + 3]
    if (a < 200) continue // transparent/near-transparent — not part of the visible logo

    const { h, s, l } = hslOf(r, g, b)
    if (l > 0.92 || l < 0.08 || s < 0.15) continue

    const key = `${Math.round(r / BUCKET_STEP)}-${Math.round(g / BUCKET_STEP)}-${Math.round(b / BUCKET_STEP)}`
    const existing = buckets.get(key)
    if (existing) {
      existing.r += r
      existing.g += g
      existing.b += b
      existing.count += 1
      existing.saturation += s
      existing.hue += h
    } else {
      buckets.set(key, { r, g, b, count: 1, saturation: s, hue: h })
    }
  }

  return [...buckets.values()].sort((x, y) => bucketScore(y) - bucketScore(x))
}

function centeredColor(bucket: ColorBucket): string {
  return toHex(bucket.r / bucket.count, bucket.g / bucket.count, bucket.b / bucket.count)
}

/**
 * Picks the most representative brand color out of raw RGBA pixel data
 * (e.g. from a canvas' `getImageData().data`). Pure and DOM-free, so it's
 * unit-testable on its own. Returns null when nothing distinctive is left
 * (e.g. a purely black-and-white logo) — callers keep the current theme color
 * untouched in that case.
 */
export function pickDominantColor(pixels: Uint8ClampedArray): string | null {
  const best = scoreBuckets(pixels)[0]
  return best ? centeredColor(best) : null
}

/**
 * Picks a two-color brand palette from the pixel data: the primary accent and,
 * when the logo is bicolor, a second hue far enough from it to soften
 * backgrounds with. `secondary` is null for single-color or monochrome logos.
 */
export function pickBrandPalette(pixels: Uint8ClampedArray): { primary: string | null; secondary: string | null } {
  const sorted = scoreBuckets(pixels)
  const primary = sorted[0]
  if (!primary) return { primary: null, secondary: null }

  const primaryHue = primary.hue / primary.count
  const secondary = sorted.find((bucket) => hueDistance(bucket.hue / bucket.count, primaryHue) >= 30) ?? null
  return {
    primary: centeredColor(primary),
    secondary: secondary ? centeredColor(secondary) : null,
  }
}

/**
 * Loads an image file, downsamples it onto an off-screen canvas, and
 * suggests a brand palette from its pixels (see `pickBrandPalette`).
 * Best-effort: resolves empty/null on any failure — never throws, so a logo
 * upload always succeeds even if the color suggestion doesn't.
 */
export function extractPaletteFromFile(file: File): Promise<{ primary: string | null; secondary: string | null }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    const empty = { primary: null, secondary: null }

    const cleanup = () => URL.revokeObjectURL(url)

    img.onload = () => {
      try {
        const size = 48
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(empty)
          return
        }
        ctx.drawImage(img, 0, 0, size, size)
        const { data } = ctx.getImageData(0, 0, size, size)
        resolve(pickBrandPalette(data))
      } catch {
        resolve(empty)
      } finally {
        cleanup()
      }
    }
    img.onerror = () => {
      cleanup()
      resolve(empty)
    }
    img.src = url
  })
}

/** Backwards-compatible single-color suggestion (primary accent only). */
export function extractDominantColorFromFile(file: File): Promise<string | null> {
  return extractPaletteFromFile(file).then((palette) => palette.primary)
}