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

/** WCAG relative-luminance contrast ratio of a "#rrggbb" color against white text. */
export function contrastWithWhite(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!match) return 21 // unknown/invalid input: don't warn

  const channel = (value: number) => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(match[1].slice(i, i + 2), 16))
  const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
  return (1 + 0.05) / (luminance + 0.05)
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
