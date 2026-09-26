/**
 * Country-aware phone number normalization/validation (Sénégal par défaut).
 *
 * Users type numbers in many shapes ("77 123 45 67", "77-123-45-67",
 * "771234567", "+221 77 123 45 67", "00221 77 123 45 67"...). Everything
 * that reaches storage must collapse to one canonical form so the same
 * number never ends up saved two different ways:
 *
 *   storage format  -> "+221771234567"
 *   display format  -> "+221 77 123 45 67"
 *
 * Local formats are read in the shop's country (`countryCode`, default SN)
 * using the presets of src/config/countries.ts — the client mirror of the
 * `countries` table. Mirrored server-side by `public.normalize_phone()`
 * (supabase/migrations/0128_countries_and_generic_phones.sql), the backstop
 * for writes that don't go through this frontend code.
 */
import { COUNTRY_PRESETS, DEFAULT_COUNTRY_CODE, getCountryPreset } from '@/config/countries'

export type PhoneErrorCode = 'empty' | 'invalid_characters' | 'invalid_length' | 'invalid_prefix'

export interface PhoneNormalizationResult {
  ok: boolean
  /** Canonical "+<indicatif><numéro national>" form, or null when normalization failed. */
  value: string | null
  error?: PhoneErrorCode
}

const fail = (error: PhoneErrorCode): PhoneNormalizationResult => ({ ok: false, value: null, error })

export function normalizePhoneNumber(input: string, countryCode: string = DEFAULT_COUNTRY_CODE): PhoneNormalizationResult {
  if (!input || !input.trim()) return fail('empty')

  const country = getCountryPreset(countryCode)
  const dial = country.dialCode.replace('+', '')
  const nationalRe = new RegExp(country.nationalRegex)

  // Drop spaces, dots, dashes and parentheses; "00" prefix means "+".
  let cleaned = input.trim().replace(/[\s.\-()]/g, '')
  if (cleaned.startsWith('00')) cleaned = `+${cleaned.slice(2)}`

  const hasPlus = cleaned.startsWith('+')
  const digits = hasPlus ? cleaned.slice(1) : cleaned
  if (!/^\d+$/.test(digits)) return fail('invalid_characters')

  let national: string
  if (hasPlus) {
    if (!digits.startsWith(dial) || digits.length !== dial.length + country.nationalNumberLength) {
      return fail('invalid_length')
    }
    national = digits.slice(dial.length)
  } else if (digits.startsWith(country.trunkPrefix) && digits.length === country.nationalNumberLength + 1) {
    // Local habit of dialling with a leading trunk prefix (not part of the plan).
    national = digits.slice(1)
  } else if (digits.length === country.nationalNumberLength) {
    national = digits
  } else if (
    digits.startsWith(dial) &&
    digits.length === dial.length + country.nationalNumberLength &&
    nationalRe.test(digits.slice(dial.length))
  ) {
    // Full international number typed without the "+", e.g. "221771234567".
    national = digits.slice(dial.length)
  } else {
    return fail('invalid_length')
  }

  if (!nationalRe.test(national)) return fail('invalid_prefix')
  return { ok: true, value: `${country.dialCode}${national}` }
}

export function validatePhoneNumber(input: string, countryCode: string = DEFAULT_COUNTRY_CODE): boolean {
  return normalizePhoneNumber(input, countryCode).ok
}

/** Message d'erreur affichable, ou null quand le numéro est valide pour le pays. */
export function validatePhoneInput(input: string, countryCode: string = DEFAULT_COUNTRY_CODE): string | null {
  if (!input.trim()) return PHONE_ERROR_MESSAGES.empty
  const result = normalizePhoneNumber(input, countryCode)
  if (result.ok) return null
  const country = getCountryPreset(countryCode)
  if (result.error === 'invalid_length' || result.error === 'invalid_prefix') {
    return `Numéro invalide pour ${country.name} : ${country.dialCode} suivi de ${country.nationalNumberLength} chiffres.`
  }
  return PHONE_ERROR_MESSAGES[result.error ?? 'invalid_length']
}

/** Formats a canonical number for display: "+221 77 123 45 67", "+225 07 12 34 56"… */
export function formatPhoneNumberForDisplay(canonical: string): string {
  const match = /^\+221([37]\d{8})$/.exec(canonical)
  if (match) {
    const n = match[1]
    return `+221 ${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5, 7)} ${n.slice(7, 9)}`
  }
  const country = COUNTRY_PRESETS.find((c) => canonical.startsWith(c.dialCode) && canonical.length === c.dialCode.length + c.nationalNumberLength)
  if (!country) return canonical
  const national = canonical.slice(country.dialCode.length)
  return `${country.dialCode} ${national.replace(/(\d{2})(?=\d)/g, '$1 ').trim()}`
}

export const PHONE_ERROR_MESSAGES: Record<PhoneErrorCode, string> = {
  empty: 'Le numéro de téléphone est requis.',
  invalid_characters: 'Le numéro ne doit contenir que des chiffres (espaces et tirets acceptés).',
  invalid_length: 'Numéro invalide : vérifiez le nombre de chiffres (ex. 77 123 45 67).',
  invalid_prefix: 'Numéro invalide : le début du numéro ne correspond pas au pays.',
}
