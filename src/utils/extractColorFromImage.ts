/**
 * Suggests a shop's theme color from its logo — so a merchant who uploads a
 * red-and-gold logo gets a red-and-gold storefront by default, instead of a
 * generic template color that has nothing to do with their brand. Always a
 * starting point: the merchant can still change it by hand afterward (see
 * the color picker in Réglages/Paramètres and in the onboarding recap).
 */

interface ColorBucket {
  r: number
  g: number
  b: number
  count: number
  saturation: number
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`
}

/** Standard HSL saturation/lightness from 0–255 RGB channels. */
function saturationAndLightness(r: number, g: number, b: number): { saturation: number; lightness: number } {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const lightness = (max + min) / 2
  if (max === min) return { saturation: 0, lightness }
  const d = max - min
  const saturation = d / (1 - Math.abs(2 * lightness - 1))
  return { saturation, lightness }
}

/**
 * Picks the most representative brand color out of raw RGBA pixel data
 * (e.g. from a canvas' `getImageData().data`). Pure and DOM-free, so it's
 * unit-testable on its own — the only part of this file worth testing;
 * everything else is Image/canvas plumbing.
 *
 * Groups pixels into coarse color buckets, skips background/text pixels
 * (near-white, near-black, or gray — a logo's flat background or its
 * outline, not its brand color), and scores each remaining bucket by how
 * common AND how saturated it is, so a small vivid logomark wins over a
 * larger but dull area. Returns null when nothing distinctive is left
 * (e.g. a purely black-and-white logo) — callers should leave the current
 * theme color untouched in that case rather than force a change.
 */
export function pickDominantColor(pixels: Uint8ClampedArray): string | null {
  const BUCKET_STEP = 24
  const buckets = new Map<string, ColorBucket>()

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]
    const g = pixels[i + 1]
    const b = pixels[i + 2]
    const a = pixels[i + 3]
    if (a < 200) continue // transparent/near-transparent — not part of the visible logo

    const { saturation, lightness } = saturationAndLightness(r, g, b)
    if (lightness > 0.92 || lightness < 0.08 || saturation < 0.15) continue

    const key = `${Math.round(r / BUCKET_STEP)}-${Math.round(g / BUCKET_STEP)}-${Math.round(b / BUCKET_STEP)}`
    const existing = buckets.get(key)
    if (existing) {
      existing.r += r
      existing.g += g
      existing.b += b
      existing.count += 1
      existing.saturation += saturation
    } else {
      buckets.set(key, { r, g, b, count: 1, saturation })
    }
  }

  let best: ColorBucket | null = null
  let bestScore = -1
  for (const bucket of buckets.values()) {
    const avgSaturation = bucket.saturation / bucket.count
    const score = bucket.count * (0.5 + avgSaturation)
    if (score > bestScore) {
      bestScore = score
      best = bucket
    }
  }
  if (!best) return null

  return toHex(best.r / best.count, best.g / best.count, best.b / best.count)
}

/**
 * Loads an image file, downsamples it onto an off-screen canvas, and
 * suggests a theme color from its pixels (see `pickDominantColor`).
 * Best-effort: resolves null on any failure (unsupported format, decode
 * error, canvas unavailable) — never throws, so a logo upload always
 * succeeds even if the color suggestion doesn't.
 */
export function extractDominantColorFromFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()

    const cleanup = () => URL.revokeObjectURL(url)

    img.onload = () => {
      try {
        const size = 48
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(null)
          return
        }
        ctx.drawImage(img, 0, 0, size, size)
        const { data } = ctx.getImageData(0, 0, size, size)
        resolve(pickDominantColor(data))
      } catch {
        resolve(null)
      } finally {
        cleanup()
      }
    }
    img.onerror = () => {
      cleanup()
      resolve(null)
    }
    img.src = url
  })
}
