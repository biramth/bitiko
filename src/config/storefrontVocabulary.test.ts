import { describe, expect, it } from 'vitest'
import { getStorefrontVocabulary, siteKindForBusinessType } from './storefrontVocabulary'

describe('getStorefrontVocabulary', () => {
  it('fails open to commerce vocabulary when unknown', () => {
    expect(getStorefrontVocabulary(null)).toEqual({
      siteKind: 'Boutique en ligne',
      catalogLabel: 'Catalogue',
      catalogHref: '/catalogue',
      cartLabel: 'Panier',
      showCart: true,
      booking: null,
    })
    expect(getStorefrontVocabulary(new Set())).toEqual(getStorefrontVocabulary(null))
  })

  it('speaks restaurant for reservations without appointments', () => {
    const vocab = getStorefrontVocabulary(new Set(['HAS_RESERVATIONS', 'HAS_PRODUCTS', 'HAS_SERVICES']))
    expect(vocab.siteKind).toBe('Restaurant')
    expect(vocab.catalogLabel).toBe('La carte')
    expect(vocab.booking).toEqual({ label: 'Réserver une table', shortLabel: 'Réserver', href: '/reserver' })
    expect(vocab.showCart).toBe(true)
  })

  it('speaks salon for appointments, boutique annex when products exist', () => {
    const withProducts = getStorefrontVocabulary(new Set(['HAS_APPOINTMENTS', 'HAS_SERVICES', 'HAS_PRODUCTS']))
    expect(withProducts.siteKind).toBe('Salon & Institut')
    expect(withProducts.catalogLabel).toBe('Boutique')
    const pureService = getStorefrontVocabulary(new Set(['HAS_APPOINTMENTS', 'HAS_SERVICES']))
    expect(pureService.catalogLabel).toBe('Prestations')
    expect(pureService.catalogHref).toBe('/prestations')
    expect(withProducts.catalogHref).toBe('/catalogue')
  })

  it('gives appointment shops a booking action, and a cart only when they sell products', () => {
    const hybrid = getStorefrontVocabulary(new Set(['HAS_APPOINTMENTS', 'HAS_SERVICES', 'HAS_PRODUCTS']))
    expect(hybrid.booking?.label).toBe('Prendre rendez-vous')
    expect(hybrid.showCart).toBe(true)
    const pureService = getStorefrontVocabulary(new Set(['HAS_APPOINTMENTS', 'HAS_SERVICES']))
    expect(pureService.booking?.href).toBe('/reserver')
    expect(pureService.showCart).toBe(false)
  })

  it('never offers booking to a pure commerce shop', () => {
    const shop = getStorefrontVocabulary(new Set(['HAS_SHOP', 'HAS_PRODUCTS', 'HAS_ORDERS']))
    expect(shop.booking).toBeNull()
    expect(shop.showCart).toBe(true)
  })
})

describe('siteKindForBusinessType', () => {
  it('matches the capability-driven kinds', () => {
    expect(siteKindForBusinessType('restauration')).toBe('Restaurant')
    expect(siteKindForBusinessType('beaute')).toBe('Salon & Institut')
    expect(siteKindForBusinessType('coiffure')).toBe('Salon & Institut')
    expect(siteKindForBusinessType('mode')).toBe('Boutique en ligne')
    expect(siteKindForBusinessType(null)).toBe('Boutique en ligne')
  })
})
