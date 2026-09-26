import type { Shop } from '@/types'

const FALLBACK_CURRENCY = 'XOF'

export function normalizeCurrency(currency: string | null | undefined): string {
  if (!currency) return FALLBACK_CURRENCY
  const candidate = currency.trim().toUpperCase()
  if (!/^[A-Z]{3}$/.test(candidate)) return FALLBACK_CURRENCY
  try {
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: candidate }).format(0)
    return candidate
  } catch {
    return FALLBACK_CURRENCY
  }
}

export function formatCurrency(amount: number, currency: string = 'XOF'): string {
  const value = Number.isFinite(amount) ? amount : 0
  const safeCurrency = normalizeCurrency(currency)
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: safeCurrency,
    maximumFractionDigits: 0,
  }).format(value)
}

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** wa.me link for a plain "contact us" click (no prefilled order message). */
export function whatsappHref(whatsappNumber: string): string {
  const digitsOnly = whatsappNumber.replace(/[^0-9]/g, '')
  return `https://wa.me/${digitsOnly}`
}

/** Parses `#rrggbb` or `#rrggbbaa`, composing any alpha over `backdrop` so the
 *  returned channels are always opaque (alpha is only meaningful against a
 *  known background, and contrast ignores it once composited). */
function parseOpaque(hex: string, backdrop: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex)
  const back = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(backdrop)
  if (!match || !back) return null
  const channels = (m: RegExpExecArray) =>
    [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) as [number, number, number]
  const alpha = match[2] != null ? parseInt(match[2], 16) / 255 : 1
  if (alpha >= 1) return channels(match)
  const a = channels(match)
  const d = channels(back)
  return [
    Math.round(a[0] * alpha + d[0] * (1 - alpha)),
    Math.round(a[1] * alpha + d[1] * (1 - alpha)),
    Math.round(a[2] * alpha + d[2] * (1 - alpha)),
  ]
}

/** WCAG relative-luminance contrast ratio between two colors, each `#rrggbb`
 *  or `#rrggbbaa` (an 8-digit color is composited over `backdropA`/`backdropB`
 *  — both default white — before the ratio, so transparency can't void it).
 *  Unknown/invalid input returns 21 (best possible — never warns). */
export function contrastRatio(
  hexA: string,
  hexB: string,
  options: { backdropA?: string; backdropB?: string } = {},
): number {
  const a = parseOpaque(hexA, options.backdropA ?? '#ffffff')
  const b = parseOpaque(hexB, options.backdropB ?? '#ffffff')
  if (!a || !b) return 21
  const channel = (value: number) => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const luminance = (channels: [number, number, number]) =>
    0.2126 * channel(channels[0]) + 0.7152 * channel(channels[1]) + 0.0722 * channel(channels[2])
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

/** WCAG relative-luminance contrast ratio of a color against white text.
 *  `#rrggbbaa` is composited over `backdrop` (default white) first. */
export function contrastWithWhite(hex: string, backdrop: string = '#ffffff'): number {
  return contrastRatio(hex, '#ffffff', { backdropA: backdrop, backdropB: '#ffffff' })
}

/** Delivery fee applied for a subtotal, honoring the shop's free-delivery threshold. */
export function resolveDeliveryFee(shop: Pick<Shop, 'delivery_fee' | 'free_delivery_threshold'>, subtotal: number): number {
  const threshold = shop.free_delivery_threshold != null ? Number(shop.free_delivery_threshold) : null
  if (threshold != null && subtotal >= threshold) return 0
  return Math.max(0, Number(shop.delivery_fee ?? 0))
}

/**
 * Zone-aware delivery fee for a subtotal. The zone's own fee applies unless the
 * cart subtotal reaches the shop's free-delivery threshold.
 */
export function resolveZoneDeliveryFee(
  shop: Pick<Shop, 'free_delivery_threshold'>,
  subtotal: number,
  zoneFee: number,
): number {
  const threshold = shop.free_delivery_threshold != null ? Number(shop.free_delivery_threshold) : null
  if (threshold != null && subtotal >= threshold) return 0
  return Math.max(0, Number(zoneFee ?? 0))
}

/** Date locale au format YYYY-MM-DD (jamais `toISOString()`, qui bascule en UTC
 *  et décale la journée pour les fuseaux UTC+1 : Nigeria, Bénin…). */
export function localDateIso(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** « à l'instant », « il y a 3 h », « hier », « il y a 4 j » — sinon la date. `now` sert aux tests. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60000)
  if (Number.isNaN(minutes) || minutes < 0) return then.toLocaleDateString('fr-FR')
  if (minutes < 2) return 'à l’instant'
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'hier'
  if (days < 7) return `il y a ${days} j`
  return then.toLocaleDateString('fr-FR')
}
