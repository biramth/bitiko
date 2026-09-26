/** Vocabulaire public du frontstore selon le métier (capabilities).
 *  Le chrome partagé — titres SEO, onglets mobile, lien header — ne peut pas
 *  être édité comme un bloc builder : il suit donc le business type. `null`
 *  (capabilities inconnues) = vocabulaire historique 100 % commerce, pour ne
 *  jamais changer une boutique legacy par surprise. */

export interface StorefrontVocabulary {
  /** Descripteur du lieu (« Boutique en ligne », « Restaurant »…) — suffixe SEO. */
  siteKind: string
  /** Libellé de la page catalogue (route /catalogue inchangée). */
  catalogLabel: string
  /** Libellé du panier (route /panier inchangée). */
  cartLabel: string
}

const COMMERCE_VOCABULARY: StorefrontVocabulary = {
  siteKind: 'Boutique en ligne',
  catalogLabel: 'Catalogue',
  cartLabel: 'Panier',
}

export function getStorefrontVocabulary(caps: Set<string> | null): StorefrontVocabulary {
  if (caps === null) return COMMERCE_VOCABULARY

  const hasAppointments = caps.has('HAS_APPOINTMENTS')
  const hasReservations = caps.has('HAS_RESERVATIONS')
  const hasServices = caps.has('HAS_SERVICES')
  const hasProducts = caps.has('HAS_PRODUCTS')

  // Restaurant : carte + réservation de tables, pas de rendez-vous.
  if (hasReservations && !hasAppointments) {
    return { siteKind: 'Restaurant', catalogLabel: 'La carte', cartLabel: 'Panier' }
  }
  // Salon / institut : rendez-vous ; la partie vente (s'il y en a une) est
  // une boutique annexe, la vitrine principale ce sont les prestations.
  if (hasAppointments) {
    return {
      siteKind: 'Salon & Institut',
      catalogLabel: hasProducts ? 'Boutique' : 'Prestations',
      cartLabel: 'Panier',
    }
  }
  // Service sans rendez-vous ni réservation (profil futur) : prestations d'abord.
  if (hasServices && !hasProducts) {
    return { siteKind: 'Prestations & Services', catalogLabel: 'Prestations', cartLabel: 'Panier' }
  }
  return COMMERCE_VOCABULARY
}

/** Raccourci serveur (api/og.ts) : pas d'accès au Set de capabilities, juste
 *  au slug du business type. Mêmes libellés que ci-dessus — toute divergence
 *  entre les deux est un bug (voir getStorefrontVocabulary). */
export function siteKindForBusinessType(slug: string | null | undefined): string {
  switch (slug) {
    case 'restauration':
    case 'food_services':
      return 'Restaurant'
    case 'beaute':
    case 'coiffure':
      return 'Salon & Institut'
    default:
      return 'Boutique en ligne'
  }
}
