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
