/** Pays d'Afrique de l'Ouest supportés pour les numéros de téléphone et le
 *  fuseau horaire par défaut d'une boutique. Miroir de
 *  `public.normalize_phone()` (migration 0128) : toute modification se fait
 *  aux deux endroits. */
export interface Country {
  code: string
  name: string
  /** Indicatif international, sans « + ». */
  dialCode: string
  /** Longueurs acceptées du numéro national (sans indicatif). */
  nationalLengths: number[]
  /** Le « 0 » de tête est un préfixe de ligne à retirer (SN, NG, GH) ; sinon il fait partie du numéro (CI, BJ). */
  trunkZero: boolean
  timezone: string
}

export const COUNTRIES: Country[] = [
  { code: 'SN', name: 'Sénégal', dialCode: '221', nationalLengths: [9], trunkZero: true, timezone: 'Africa/Dakar' },
  { code: 'CI', name: 'Côte d’Ivoire', dialCode: '225', nationalLengths: [10], trunkZero: false, timezone: 'Africa/Abidjan' },
  { code: 'ML', name: 'Mali', dialCode: '223', nationalLengths: [8], trunkZero: false, timezone: 'Africa/Bamako' },
  { code: 'BF', name: 'Burkina Faso', dialCode: '226', nationalLengths: [8], trunkZero: false, timezone: 'Africa/Ouagadougou' },
  { code: 'BJ', name: 'Bénin', dialCode: '229', nationalLengths: [8, 10], trunkZero: false, timezone: 'Africa/Porto-Novo' },
  { code: 'TG', name: 'Togo', dialCode: '228', nationalLengths: [8], trunkZero: false, timezone: 'Africa/Lome' },
  { code: 'NE', name: 'Niger', dialCode: '227', nationalLengths: [8], trunkZero: false, timezone: 'Africa/Niamey' },
  { code: 'GN', name: 'Guinée', dialCode: '224', nationalLengths: [9], trunkZero: false, timezone: 'Africa/Conakry' },
  { code: 'NG', name: 'Nigeria', dialCode: '234', nationalLengths: [10], trunkZero: true, timezone: 'Africa/Lagos' },
  { code: 'GH', name: 'Ghana', dialCode: '233', nationalLengths: [9], trunkZero: true, timezone: 'Africa/Accra' },
]

export const DEFAULT_COUNTRY_CODE = 'SN'

export const COUNTRY_BY_CODE: Record<string, Country> = Object.fromEntries(COUNTRIES.map((c) => [c.code, c]))
