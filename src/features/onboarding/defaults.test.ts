import { describe, expect, it } from 'vitest'
import { defaultDescription, defaultProfile, detectCountryCode, parseInternationalInput, readUserNames } from './defaults'

describe('detectCountryCode', () => {
  it('déduit le pays du fuseau horaire', () => {
    expect(detectCountryCode('Africa/Abidjan')).toBe('CI')
    expect(detectCountryCode('Africa/Lagos')).toBe('NG')
  })

  it('retombe sur le Sénégal, ou sur le premier pays autorisé', () => {
    expect(detectCountryCode('Europe/Berlin')).toBe('SN')
    expect(detectCountryCode(undefined)).toBe('SN')
    expect(detectCountryCode('Africa/Lagos', ['SN', 'CI'])).toBe('SN')
    expect(detectCountryCode('Europe/Berlin', ['CI', 'ML'])).toBe('CI')
  })
})

describe('parseInternationalInput', () => {
  it('reconnaît le pays et retire l’indicatif', () => {
    expect(parseInternationalInput('+225 01 23 45 67 8')).toEqual({ countryCode: 'CI', national: '012345678' })
    expect(parseInternationalInput('00221771234567')).toEqual({ countryCode: 'SN', national: '771234567' })
    expect(parseInternationalInput('+33 6 12 34 56 78')).toEqual({ countryCode: 'FR', national: '612345678' })
  })

  it('distingue +27 (Afrique du Sud) de +227 (Niger)', () => {
    expect(parseInternationalInput('+27 82 123 4567')?.countryCode).toBe('ZA')
    expect(parseInternationalInput('+227 90 12 34 56')?.countryCode).toBe('NE')
  })

  it('ignore les numéros locaux et les pays non autorisés', () => {
    expect(parseInternationalInput('77 123 45 67')).toBeNull()
    expect(parseInternationalInput('+999 123')).toBeNull()
    expect(parseInternationalInput('+225 01 23 45 67 8', ['SN'])).toBeNull()
  })
})

describe('readUserNames', () => {
  it('lit given_name / family_name', () => {
    expect(readUserNames({ given_name: 'Awa', family_name: 'Diop' })).toEqual({ firstName: 'Awa', lastName: 'Diop' })
  })

  it('découpe full_name ou name', () => {
    expect(readUserNames({ full_name: 'Awa Marie Diop' })).toEqual({ firstName: 'Awa', lastName: 'Marie Diop' })
    expect(readUserNames({ name: 'Moussa' })).toEqual({ firstName: 'Moussa', lastName: '' })
  })

  it('tolère l’absence de métadonnées', () => {
    expect(readUserNames(null)).toEqual({ firstName: '', lastName: '' })
    expect(readUserNames({ full_name: 42 })).toEqual({ firstName: '', lastName: '' })
  })
})

describe('defaultProfile', () => {
  it('commerce : description produits, livraison et paiement à la livraison', () => {
    const profile = defaultProfile({ name: 'Chez Awa', caps: ['HAS_PRODUCTS', 'HAS_ORDERS', 'HAS_DELIVERY'] })
    expect(profile.description).toContain('Chez Awa')
    expect(profile.description).toContain('commandez')
    expect(profile.homeDelivery).toBe(true)
    expect(profile.payOnDelivery).toBe(true)
  })

  it('service : réservation, pas de livraison', () => {
    const profile = defaultProfile({ name: 'Salon Aïssa', caps: ['HAS_SERVICES', 'HAS_APPOINTMENTS'] })
    expect(profile.description).toMatch(/Réservez/)
    expect(profile.homeDelivery).toBe(false)
    expect(profile.payOnDelivery).toBe(false)
  })

  it('mixte : produits et prestations', () => {
    expect(defaultDescription('Institut Y', ['HAS_PRODUCTS', 'HAS_SERVICES'])).toMatch(/produits et prestations/)
  })

  it('capacités inconnues : comportement commerce par défaut', () => {
    const profile = defaultProfile({ name: 'X', caps: null })
    expect(profile.homeDelivery).toBe(true)
    expect(profile.description).toMatch(/commandez/)
  })

  it('ne partage pas la FAQ avec la constante', () => {
    const profile = defaultProfile({ name: 'X', caps: null })
    profile.faq[0]!.question = 'modifié'
    expect(defaultProfile({ name: 'X', caps: null }).faq[0]!.question).toBe('')
  })
})
