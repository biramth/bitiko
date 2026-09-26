import { describe, expect, it } from 'vitest'
import { getStorefrontVocabulary, siteKindForBusinessType } from './storefrontVocabulary'

describe('getStorefrontVocabulary', () => {
  it('fails open to commerce vocabulary when unknown', () => {
    expect(getStorefrontVocabulary(null)).toEqual({
      siteKind: 'Boutique en ligne',
      catalogLabel: 'Catalogue',
      catalogHref: '/catalogue',
      cartLabel: 'Panier',
    })
    expect(getStorefrontVocabulary(new Set())).toEqual({
      siteKind: 'Boutique en ligne',
      catalogLabel: 'Catalogue',
      catalogHref: '/catalogue',
      cartLabel: 'Panier',
    })
  })

  it('speaks restaurant for reservations without appointments', () => {
    const vocab = getStorefrontVocabulary(new Set(['HAS_RESERVATIONS', 'HAS_PRODUCTS', 'HAS_SERVICES']))
    expect(vocab.siteKind).toBe('Restaurant')
    expect(vocab.catalogLabel).toBe('La carte')
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
