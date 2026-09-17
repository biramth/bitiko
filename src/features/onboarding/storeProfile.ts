/** The merchant's onboarding answers about their shop. The storefront is
 *  generated from these (see `generateStorefront`), and the raw answers are
 *  persisted on `shops.onboarding_responses` so re-applying a style later can
 *  re-personalize the layout instead of falling back to generic template copy. */

export type StoreAudience = 'particuliers' | 'professionnels' | 'mixte'
export type StorePriceRange = 'entree' | 'milieu' | 'haut'

export interface StoreFaqItem {
  question: string
  answer: string
}

export interface StoreProfileAnswers {
  /** "Décris ta boutique en une phrase" — becomes shop.description + hero subheading. */
  description: string
  audience: StoreAudience
  homeDelivery: boolean
  payOnDelivery: boolean
  /** "Produits préparés sur commande" (fabrication, produits frais…) — shapes the promo copy. */
  madeToOrder: boolean
  expressDelivery: boolean
  priceRange: StorePriceRange
  /** "Parle de ton histoire" — becomes the "Notre histoire" text section. */
  story: string
  /** Q/A pairs — rendered as a FAQ section when at least one is complete. */
  faq: StoreFaqItem[]
}

export const AUDIENCE_LABELS: Record<StoreAudience, string> = {
  particuliers: 'Particuliers',
  professionnels: 'Professionnels',
  mixte: 'Les deux',
}

export const PRICE_RANGE_LABELS: Record<StorePriceRange, string> = {
  entree: 'Entrée de gamme',
  milieu: 'Milieu de gamme',
  haut: 'Haut de gamme',
}

export const EMPTY_STORE_PROFILE: StoreProfileAnswers = {
  description: '',
  audience: 'particuliers',
  homeDelivery: true,
  payOnDelivery: true,
  madeToOrder: false,
  expressDelivery: false,
  priceRange: 'milieu',
  story: '',
  faq: [
    { question: '', answer: '' },
    { question: '', answer: '' },
  ],
}

/** The number of FAQ slots shown in the onboarding form. */
export const FAQ_SLOTS = 2

/** Reads the saved answers off a shop row. Returns null for shops that
 *  predate onboarding responses, so callers know not to personalize. */
export function profileFromShop(shop: { onboarding_responses?: unknown } | null | undefined): StoreProfileAnswers | null {
  if (!shop?.onboarding_responses) return null
  const raw = shop.onboarding_responses as Partial<StoreProfileAnswers> | null
  if (!raw || typeof raw !== 'object') return null
  return {
    ...EMPTY_STORE_PROFILE,
    ...raw,
    audience: raw.audience === 'particuliers' || raw.audience === 'professionnels' || raw.audience === 'mixte' ? raw.audience : EMPTY_STORE_PROFILE.audience,
    priceRange: raw.priceRange === 'entree' || raw.priceRange === 'milieu' || raw.priceRange === 'haut' ? raw.priceRange : EMPTY_STORE_PROFILE.priceRange,
    faq: Array.isArray(raw.faq) ? raw.faq.filter((item) => item && typeof item === 'object') : [],
  } as StoreProfileAnswers
}