/**
 * West-African phone number normalization/validation (Sénégal par défaut).
 *
 * Users type numbers in many shapes ("77 123 45 67", "77-123-45-67",
 * "771234567", "+221 77 123 45 67", "00221 77 123 45 67"...). Everything
 * that reaches storage must collapse to one canonical form so the same
 * number never ends up saved two different ways:
 *
 *   storage format  -> "+221771234567"
 *   display format  -> "+221 77 123 45 67"
 *
 * Local formats are read in the shop's country (`country`, default SN);
 * international "+<indicatif>" numbers are accepted for every supported
 * country (src/config/countries.ts). Mirrored server-side by
 * `public.normalize_phone()` (migration 0128; SN legacy in
 * `normalize_sn_phone()`, 0063), the backstop for writes that don't go
 * through this frontend code.
 */
import { COUNTRIES, COUNTRY_BY_CODE, DEFAULT_COUNTRY_CODE, type Country } from '@/config/countries'

// Senegalese numbers start with 3 (fixed line) or 7 (mobile).
const SN_NATIONAL_RE = /^[37]\d{8}$/

export type PhoneErrorCode = 'empty' | 'invalid_characters' | 'invalid_length' | 'invalid_prefix'

export interface PhoneNormalizationResult {
  ok: boolean
  /** Canonical "+<indicatif><numéro national>" form, or null when normalization failed. */
  value: string | null
  error?: PhoneErrorCode
}

const fail = (error: PhoneErrorCode): PhoneNormalizationResult => ({ ok: false, value: null, error })

function finish(country: Country, national: string): PhoneNormalizationResult {
  if (country.code === 'SN' && !SN_NATIONAL_RE.test(national)) return fail('invalid_prefix')
  return { ok: true, value: `+${country.dialCode}${national}` }
}

export function normalizePhoneNumber(input: string, countryCode: string = DEFAULT_COUNTRY_CODE): PhoneNormalizationResult {
  if (!input || !input.trim()) return fail('empty')

  // Drop spaces, dots, dashes and parentheses; "00" prefix means "+".
  let cleaned = input.trim().replace(/[\s.\-()]/g, '')
  if (cleaned.startsWith('00')) cleaned = `+${cleaned.slice(2)}`

  const hasPlus = cleaned.startsWith('+')
  const rest = hasPlus ? cleaned.slice(1) : cleaned
  if (!/^\d+$/.test(rest)) return fail('invalid_characters')

  const home = COUNTRY_BY_CODE[countryCode] ?? COUNTRY_BY_CODE[DEFAULT_COUNTRY_CODE]

  // International form, or the home indicatif typed without "+".
  const international = COUNTRIES.find((c) => rest.startsWith(c.dialCode))
  if (international && (hasPlus || (international.code === home.code && rest.length > home.nationalLengths[0] + 1))) {
    const national = rest.slice(international.dialCode.length)
    if (international.nationalLengths.includes(national.length)) return finish(international, national)
    if (hasPlus) return fail('invalid_length')
  }
  if (hasPlus) return fail('invalid_length')

  // Local form, read in the shop's country.
  if (home.trunkZero && rest.startsWith('0') && home.nationalLengths.includes(rest.length - 1)) {
    // Local habit of dialling with a leading trunk "0" (not part of the plan).
    return finish(home, rest.slice(1))
  }
  if (home.nationalLengths.includes(rest.length)) return finish(home, rest)
  return fail('invalid_length')
}

export function validatePhoneNumber(input: string, countryCode: string = DEFAULT_COUNTRY_CODE): boolean {
  return normalizePhoneNumber(input, countryCode).ok
}

/** Formats a canonical number for display: "+221 77 123 45 67", "+225 07 12 34 56 78"… */
export function formatPhoneNumberForDisplay(canonical: string): string {
  const match = /^\+(\d{3})(\d{8,10})$/.exec(canonical)
  if (!match) return canonical
  const country = COUNTRIES.find((c) => c.dialCode === match[1])
  if (!country) return canonical
  const n = match[2]
  if (country.code === 'SN') return `+221 ${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5, 7)} ${n.slice(7, 9)}`
  return `+${country.dialCode} ${n.replace(/(\d{2})(?=\d)/g, '$1 ').trim()}`
}

export const PHONE_ERROR_MESSAGES: Record<PhoneErrorCode, string> = {
  empty: 'Le numéro de téléphone est requis.',
  invalid_characters: 'Le numéro ne doit contenir que des chiffres (espaces et tirets acceptés).',
  invalid_length: 'Numéro invalide : vérifiez le nombre de chiffres (ex. 77 123 45 67, ou +225 07 12 34 56 78 depuis l’étranger).',
  invalid_prefix: 'Numéro sénégalais invalide : il doit commencer par 7 (mobile) ou 3 (fixe).',
}
