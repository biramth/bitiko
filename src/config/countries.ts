/**
 * Static country presets — the client-side mirror of the `countries` seed in
 * supabase/migrations/0056_countries_and_generic_phones.sql. The database is
 * the source of truth at runtime (`countries.is_enabled`, read through
 * src/services/country.service.ts); these presets exist so phone validation
 * and UX hints can run synchronously without a round-trip.
 *
 * Keep the two in sync when a country or dialling rule changes.
 */

export interface CountryPreset {
  code: string
  name: string
  dialCode: string
  trunkPrefix: string
  nationalNumberLength: number
  nationalRegex: string
  currencyCode: string
}

export const DEFAULT_COUNTRY_CODE = 'SN'

export const COUNTRY_PRESETS: CountryPreset[] = [
  { code: 'SN', name: 'Sénégal', dialCode: '+221', trunkPrefix: '0', nationalNumberLength: 9, nationalRegex: '^[37][0-9]{8}$', currencyCode: 'XOF' },
  { code: 'CI', name: "Côte d'Ivoire", dialCode: '+225', trunkPrefix: '0', nationalNumberLength: 8, nationalRegex: '^[0-9]{8}$', currencyCode: 'XOF' },
  { code: 'ML', name: 'Mali', dialCode: '+223', trunkPrefix: '0', nationalNumberLength: 8, nationalRegex: '^[0-9]{8}$', currencyCode: 'XOF' },
  { code: 'BF', name: 'Burkina Faso', dialCode: '+226', trunkPrefix: '0', nationalNumberLength: 8, nationalRegex: '^[67][0-9]{7}$', currencyCode: 'XOF' },
  { code: 'GN', name: 'Guinée', dialCode: '+224', trunkPrefix: '0', nationalNumberLength: 9, nationalRegex: '^[0-9]{9}$', currencyCode: 'GNF' },
  { code: 'TG', name: 'Togo', dialCode: '+228', trunkPrefix: '0', nationalNumberLength: 8, nationalRegex: '^[0-9]{8}$', currencyCode: 'XOF' },
  { code: 'BJ', name: 'Bénin', dialCode: '+229', trunkPrefix: '0', nationalNumberLength: 8, nationalRegex: '^[0-9]{8}$', currencyCode: 'XOF' },
  { code: 'NE', name: 'Niger', dialCode: '+227', trunkPrefix: '0', nationalNumberLength: 8, nationalRegex: '^[0-9]{8}$', currencyCode: 'XOF' },
  { code: 'CM', name: 'Cameroun', dialCode: '+237', trunkPrefix: '0', nationalNumberLength: 9, nationalRegex: '^[0-9]{9}$', currencyCode: 'XAF' },
  { code: 'GA', name: 'Gabon', dialCode: '+241', trunkPrefix: '0', nationalNumberLength: 8, nationalRegex: '^[0-9]{8}$', currencyCode: 'XAF' },
  { code: 'CG', name: 'Congo-Brazzaville', dialCode: '+242', trunkPrefix: '0', nationalNumberLength: 9, nationalRegex: '^[0-9]{9}$', currencyCode: 'XAF' },
  { code: 'CD', name: 'RD Congo', dialCode: '+243', trunkPrefix: '0', nationalNumberLength: 9, nationalRegex: '^[0-9]{9}$', currencyCode: 'CDF' },
  { code: 'MG', name: 'Madagascar', dialCode: '+261', trunkPrefix: '0', nationalNumberLength: 9, nationalRegex: '^[0-9]{9}$', currencyCode: 'MGA' },
  { code: 'RW', name: 'Rwanda', dialCode: '+250', trunkPrefix: '0', nationalNumberLength: 9, nationalRegex: '^[0-9]{9}$', currencyCode: 'RWF' },
  { code: 'KE', name: 'Kenya', dialCode: '+254', trunkPrefix: '0', nationalNumberLength: 9, nationalRegex: '^[0-9]{9}$', currencyCode: 'KES' },
  { code: 'GH', name: 'Ghana', dialCode: '+233', trunkPrefix: '0', nationalNumberLength: 9, nationalRegex: '^[0-9]{9}$', currencyCode: 'GHS' },
  { code: 'NG', name: 'Nigeria', dialCode: '+234', trunkPrefix: '0', nationalNumberLength: 10, nationalRegex: '^[0-9]{10}$', currencyCode: 'NGN' },
  { code: 'MA', name: 'Maroc', dialCode: '+212', trunkPrefix: '0', nationalNumberLength: 9, nationalRegex: '^[0-9]{9}$', currencyCode: 'MAD' },
  { code: 'FR', name: 'France', dialCode: '+33', trunkPrefix: '0', nationalNumberLength: 9, nationalRegex: '^[1-9][0-9]{8}$', currencyCode: 'EUR' },
  { code: 'ZA', name: 'Afrique du Sud', dialCode: '+27', trunkPrefix: '0', nationalNumberLength: 9, nationalRegex: '^[0-9]{9}$', currencyCode: 'ZAR' },
]

export function getCountryPreset(code: string | null | undefined): CountryPreset {
  return COUNTRY_PRESETS.find((country) => country.code === code) ?? COUNTRY_PRESETS[0]
}

/** Input-placeholder hint: `+221XXXXXXXXX`, `+225XXXXXXXX`, etc. */
export function phonePlaceholder(countryCode: string | null | undefined): string {
  const country = getCountryPreset(countryCode)
  return `${country.dialCode}${'X'.repeat(country.nationalNumberLength)}`
}
/** Fuseau horaire par défaut des créneaux de réservation, par pays. */
export const COUNTRY_TIMEZONES: Record<string, string> = {
  SN: 'Africa/Dakar',
  CI: 'Africa/Abidjan',
  ML: 'Africa/Bamako',
  BF: 'Africa/Ouagadougou',
  GN: 'Africa/Conakry',
  TG: 'Africa/Lome',
  BJ: 'Africa/Porto-Novo',
  NE: 'Africa/Niamey',
  CM: 'Africa/Douala',
  GA: 'Africa/Libreville',
  CG: 'Africa/Brazzaville',
  CD: 'Africa/Kinshasa',
  MG: 'Indian/Antananarivo',
  RW: 'Africa/Kigali',
  KE: 'Africa/Nairobi',
  GH: 'Africa/Accra',
  NG: 'Africa/Lagos',
  MA: 'Africa/Casablanca',
  FR: 'Europe/Paris',
  ZA: 'Africa/Johannesburg',
}

export function defaultTimezoneForCountry(code: string | null | undefined): string {
  return COUNTRY_TIMEZONES[code ?? ''] ?? COUNTRY_TIMEZONES[DEFAULT_COUNTRY_CODE]
}
