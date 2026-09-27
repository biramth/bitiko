import { COUNTRY_PRESETS, COUNTRY_TIMEZONES, DEFAULT_COUNTRY_CODE } from '@/config/countries'
import { EMPTY_STORE_PROFILE, type StoreProfileAnswers } from './storeProfile'

/** Pays déduit du fuseau horaire du navigateur (Africa/Abidjan → CI), limité aux pays proposés. */
export function detectCountryCode(timeZone: string | undefined, allowed?: readonly string[]): string {
  const found = Object.entries(COUNTRY_TIMEZONES).find(([, zone]) => zone === timeZone)?.[0]
  if (found && (!allowed || allowed.includes(found))) return found
  if (allowed && !allowed.includes(DEFAULT_COUNTRY_CODE)) return allowed[0] ?? DEFAULT_COUNTRY_CODE
  return DEFAULT_COUNTRY_CODE
}

/** Numéro saisi en format international ("+225 01 23…" ou "00225…") : pays reconnu + numéro national. */
export function parseInternationalInput(
  raw: string,
  allowed?: readonly string[],
): { countryCode: string; national: string } | null {
  const trimmed = raw.trim()
  const digits = trimmed.startsWith('+')
    ? trimmed.slice(1).replace(/\D/g, '')
    : trimmed.startsWith('00')
      ? trimmed.slice(2).replace(/\D/g, '')
      : null
  if (!digits) return null
  const match = COUNTRY_PRESETS.filter((c) => !allowed || allowed.includes(c.code))
    .filter((c) => digits.startsWith(c.dialCode.slice(1)))
    .sort((a, b) => b.dialCode.length - a.dialCode.length)[0]
  if (!match) return null
  return { countryCode: match.code, national: digits.slice(match.dialCode.length - 1) }
}

/** Prénom / nom à partir des métadonnées du compte (Google : given_name, family_name, full_name). */
export function readUserNames(metadata: Record<string, unknown> | null | undefined): { firstName: string; lastName: string } {
  const text = (key: string) => (typeof metadata?.[key] === 'string' ? (metadata[key] as string).trim() : '')
  const given = text('given_name')
  const family = text('family_name')
  if (given || family) return { firstName: given, lastName: family }
  const full = text('full_name') || text('name')
  const [first = '', ...rest] = full.split(/\s+/).filter(Boolean)
  return { firstName: first, lastName: rest.join(' ') }
}

const isService = (caps: readonly string[]) => caps.includes('HAS_APPOINTMENTS') || caps.includes('HAS_SERVICES')
const isCommerce = (caps: readonly string[]) => caps.includes('HAS_PRODUCTS') || caps.includes('HAS_SHOP')

/** Description de départ, modifiable ensuite depuis le tableau de bord. */
export function defaultDescription(name: string, caps: readonly string[] | null): string {
  const shop = name.trim()
  if (caps && isService(caps) && isCommerce(caps)) {
    return `Bienvenue chez ${shop} : découvrez nos produits et prestations, commandez ou réservez en quelques clics.`
  }
  if (caps && isService(caps)) {
    return `Réservez en ligne chez ${shop} : choisissez votre prestation et votre créneau en quelques clics.`
  }
  return `Bienvenue chez ${shop}. Découvrez nos produits et commandez en quelques clics, nous vous répondons sur WhatsApp.`
}

/**
 * Réponses de profil par défaut pour un nouveau site : description générée,
 * livraison et paiement à la livraison seulement si le métier les supporte
 * (un salon de coiffure n'affiche pas « livraison à domicile »).
 */
export function defaultProfile(input: { name: string; caps: readonly string[] | null }): StoreProfileAnswers {
  const { name, caps } = input
  return {
    ...EMPTY_STORE_PROFILE,
    description: defaultDescription(name, caps),
    homeDelivery: caps === null || caps.includes('HAS_DELIVERY'),
    payOnDelivery: caps === null || caps.includes('HAS_ORDERS'),
    faq: EMPTY_STORE_PROFILE.faq.map((item) => ({ ...item })),
  }
}
