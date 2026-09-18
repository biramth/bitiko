/**
 * Senegalese phone number normalization/validation.
 *
 * Users type numbers in many shapes ("77 123 45 67", "77-123-45-67",
 * "771234567", "+221 77 123 45 67", "00221 77 123 45 67"...). Everything
 * that reaches storage must collapse to one canonical form so the same
 * number never ends up saved two different ways:
 *
 *   storage format  -> "+221771234567"
 *   display format  -> "+221 77 123 45 67"
 *
 * Mirrored server-side by `public.normalize_sn_phone()` (see
 * supabase/migrations/0054_normalize_phone_numbers.sql), which is the
 * backstop for writes that don't go through this frontend code.
 */

const COUNTRY_CODE = '221'
const NATIONAL_LENGTH = 9
// Senegalese numbers start with 3 (fixed line) or 7 (mobile).
const NATIONAL_RE = /^[37]\d{8}$/

export type PhoneErrorCode = 'empty' | 'invalid_characters' | 'invalid_length' | 'invalid_prefix'

export interface PhoneNormalizationResult {
  ok: boolean
  /** Canonical "+221XXXXXXXXX" form, or null when normalization failed. */
  value: string | null
  error?: PhoneErrorCode
}

export function normalizePhoneNumber(input: string): PhoneNormalizationResult {
  if (!input || !input.trim()) {
    return { ok: false, value: null, error: 'empty' }
  }

  // Drop spaces, dots, dashes and parentheses; "00" prefix means "+".
  let cleaned = input.trim().replace(/[\s.\-()]/g, '')
  if (cleaned.startsWith('00')) {
    cleaned = `+${cleaned.slice(2)}`
  }

  const hasPlus = cleaned.startsWith('+')
  const rest = hasPlus ? cleaned.slice(1) : cleaned
  if (!/^\d+$/.test(rest)) {
    return { ok: false, value: null, error: 'invalid_characters' }
  }

  let national: string
  if (rest.startsWith(COUNTRY_CODE) && rest.length === COUNTRY_CODE.length + NATIONAL_LENGTH) {
    national = rest.slice(COUNTRY_CODE.length)
  } else if (!hasPlus && rest.length === NATIONAL_LENGTH + 1 && rest.startsWith('0')) {
    // Local habit of dialling with a leading trunk "0" (not part of the plan).
    national = rest.slice(1)
  } else if (!hasPlus && rest.length === NATIONAL_LENGTH) {
    national = rest
  } else {
    return { ok: false, value: null, error: 'invalid_length' }
  }

  if (!NATIONAL_RE.test(national)) {
    return { ok: false, value: null, error: 'invalid_prefix' }
  }

  return { ok: true, value: `+${COUNTRY_CODE}${national}` }
}

export function validatePhoneNumber(input: string): boolean {
  return normalizePhoneNumber(input).ok
}

/** Formats a canonical "+221XXXXXXXXX" number for display: "+221 XX XXX XX XX". */
export function formatPhoneNumberForDisplay(canonical: string): string {
  const match = /^\+221([37]\d{8})$/.exec(canonical)
  if (!match) return canonical
  const n = match[1]
  return `+221 ${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5, 7)} ${n.slice(7, 9)}`
}

export const PHONE_ERROR_MESSAGES: Record<PhoneErrorCode, string> = {
  empty: 'Le numéro de téléphone est requis.',
  invalid_characters: 'Le numéro ne doit contenir que des chiffres (espaces et tirets acceptés).',
  invalid_length: 'Le numéro doit comporter 9 chiffres (ex. 77 123 45 67).',
  invalid_prefix: 'Numéro sénégalais invalide : il doit commencer par 7 (mobile) ou 3 (fixe).',
}
