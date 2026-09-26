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
  /** Cible du lien catalogue : `/prestations` quand la vitrine ne vend aucun
   *  produit (un salon 100 % service n'a rien à lister sous `/catalogue`). */
  catalogHref: string
  /** Libellé du panier (route /panier inchangée). */
  cartLabel: string
  /** Le visiteur peut acheter : un salon 100 % prestations n'a ni panier ni
   *  onglet « Panier ». */
  showCart: boolean
  /** Action de réservation propre au métier (rendez-vous, table) — l'appel à
   *  l'action principal d'un salon ou d'un restaurant. `null` = commerce pur. */
  booking: StorefrontBooking | null
}

export interface StorefrontBooking {
  /** Libellé complet (bouton du hero, du header). */
  label: string
  /** Libellé court pour la barre d'onglets mobile. */
  shortLabel: string
  /** Page publique de réservation (route `/reserver`). */
  href: string
}

const BOOKING_HREF = '/reserver'

/** Libellé d'un lien « aller voir le catalogue » selon le métier. */
export function catalogCtaLabel(vocab: Pick<StorefrontVocabulary, 'catalogLabel'>): string {
  switch (vocab.catalogLabel) {
    case 'La carte':
      return 'Voir la carte'
    case 'Prestations':
      return 'Voir nos prestations'
    case 'Boutique':
      return 'Voir la boutique'
    default:
      return 'Voir le catalogue'
  }
}

const COMMERCE_VOCABULARY: StorefrontVocabulary = {
  siteKind: 'Boutique en ligne',
  catalogLabel: 'Catalogue',
  catalogHref: '/catalogue',
  cartLabel: 'Panier',
  showCart: true,
  booking: null,
}

export function getStorefrontVocabulary(caps: Set<string> | null): StorefrontVocabulary {
  if (caps === null) return COMMERCE_VOCABULARY

  const hasAppointments = caps.has('HAS_APPOINTMENTS')
  const hasReservations = caps.has('HAS_RESERVATIONS')
  const hasServices = caps.has('HAS_SERVICES')
  const hasProducts = caps.has('HAS_PRODUCTS')

  // Restaurant : carte + réservation de tables, pas de rendez-vous.
  if (hasReservations && !hasAppointments) {
    return {
      siteKind: 'Restaurant',
      catalogLabel: 'La carte',
      catalogHref: '/catalogue',
      cartLabel: 'Panier',
      showCart: hasProducts,
      booking: { label: 'Réserver une table', shortLabel: 'Réserver', href: BOOKING_HREF },
    }
  }
  // Salon / institut : rendez-vous ; la partie vente (s'il y en a une) est
  // une boutique annexe, la vitrine principale ce sont les prestations.
  if (hasAppointments) {
    return {
      siteKind: 'Salon & Institut',
      catalogLabel: hasProducts ? 'Boutique' : 'Prestations',
      catalogHref: hasProducts ? '/catalogue' : '/prestations',
      cartLabel: 'Panier',
      showCart: hasProducts,
      booking: { label: 'Prendre rendez-vous', shortLabel: 'Réserver', href: BOOKING_HREF },
    }
  }
  // Service sans rendez-vous ni réservation (profil futur) : prestations d'abord.
  if (hasServices && !hasProducts) {
    return {
      siteKind: 'Prestations & Services',
      catalogLabel: 'Prestations',
      catalogHref: '/prestations',
      cartLabel: 'Panier',
      showCart: false,
      booking: null,
    }
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
