/**
 * Price/amount normalization and validation.
 *
 * Merchants and CSV imports type prices in many shapes ("3000", "3 000",
 * "3,000", "3.000", "3000 FCFA", "3000f", "3 000 FCFA"...). The monetary
 * unit ("FCFA", "F", "CFA") is presentational and must never end up stored
 * inside the numeric value, and thousands separators must not be confused
 * with a decimal point: "3.5" stays 3.5, it never becomes 35.
 *
 * This app only ever displays whole amounts (see `formatCurrency` in
 * `./format.ts`, which always renders with `maximumFractionDigits: 0`), so
 * by default decimals are rejected rather than silently rounded — the
 * caller decides to store 3000, not something the merchant didn't type.
 */

export type PriceErrorCode = 'empty' | 'invalid' | 'negative' | 'decimal_not_allowed'

export interface PriceNormalizationResult {
  ok: boolean
  value: number | null
  error?: PriceErrorCode
}

// Trailing currency unit: "FCFA", "F CFA", "CFA" or "F", any casing, with or
// without a separating space, only ever a suffix (that's how it's typed).
const CURRENCY_SUFFIX_RE = /\s*(fcfa|f\s*cfa|cfa|f)\s*$/i
const ALLOWED_CHARS_RE = /^-?[\d.,]+$/
const COMMA_THOUSANDS_RE = /^-?\d{1,3}(,\d{3})+$/
const DOT_THOUSANDS_RE = /^-?\d{1,3}(\.\d{3})+$/

export function normalizePrice(
  input: string | number,
  { allowDecimals = false }: { allowDecimals?: boolean } = {},
): PriceNormalizationResult {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return { ok: false, value: null, error: 'invalid' }
    return finalize(input, allowDecimals)
  }

  let str = input.trim()
  if (str === '') return { ok: false, value: null, error: 'empty' }

  str = str.replace(CURRENCY_SUFFIX_RE, '').trim()
  if (str === '') return { ok: false, value: null, error: 'empty' }

  str = str.replace(/\s+/g, '')
  if (!ALLOWED_CHARS_RE.test(str)) return { ok: false, value: null, error: 'invalid' }

  let normalized: string
  if (COMMA_THOUSANDS_RE.test(str)) {
    normalized = str.replace(/,/g, '')
  } else if (DOT_THOUSANDS_RE.test(str)) {
    normalized = str.replace(/\./g, '')
  } else {
    const lastComma = str.lastIndexOf(',')
    const lastDot = str.lastIndexOf('.')
    if (lastComma === -1 && lastDot === -1) {
      normalized = str
    } else {
      const decimalIndex = Math.max(lastComma, lastDot)
      const intPart = str.slice(0, decimalIndex).replace(/[.,]/g, '')
      const fracPart = str.slice(decimalIndex + 1)
      if (!/^-?\d+$/.test(intPart) || !/^\d*$/.test(fracPart)) {
        return { ok: false, value: null, error: 'invalid' }
      }
      normalized = fracPart ? `${intPart}.${fracPart}` : intPart
    }
  }

  const value = Number(normalized)
  if (Number.isNaN(value)) return { ok: false, value: null, error: 'invalid' }
  return finalize(value, allowDecimals)
}

function finalize(value: number, allowDecimals: boolean): PriceNormalizationResult {
  if (value < 0) return { ok: false, value: null, error: 'negative' }
  if (!allowDecimals && !Number.isInteger(value)) {
    return { ok: false, value: null, error: 'decimal_not_allowed' }
  }
  return { ok: true, value }
}

export function validatePrice(input: string | number, options?: { allowDecimals?: boolean }): boolean {
  return normalizePrice(input, options).ok
}

export const PRICE_ERROR_MESSAGES: Record<PriceErrorCode, string> = {
  empty: 'Le prix est requis.',
  invalid: 'Prix invalide. Utilisez uniquement des chiffres (ex. 3000 ou 3 000 FCFA).',
  negative: 'Le prix ne peut pas être négatif.',
  decimal_not_allowed: 'Le prix doit être un nombre entier, sans centimes (ex. 3000, pas 3000.50).',
}
