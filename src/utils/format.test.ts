import { describe, expect, it } from 'vitest'
import {
  contrastWithWhite,
  formatCurrency,
  normalizeCurrency,
  resolveDeliveryFee,
  resolveZoneDeliveryFee,
  slugify,
  whatsappHref,
} from './format'

describe('normalizeCurrency', () => {
  it('falls back to XOF on missing or invalid input', () => {
    expect(normalizeCurrency(null)).toBe('XOF')
    expect(normalizeCurrency(undefined)).toBe('XOF')
    expect(normalizeCurrency('')).toBe('XOF')
    expect(normalizeCurrency('E')).toBe('XOF')
    expect(normalizeCurrency('US')).toBe('XOF')
    expect(normalizeCurrency('EURA')).toBe('XOF')
  })

  it('normalizes valid codes to uppercase', () => {
    expect(normalizeCurrency('eur')).toBe('EUR')
    expect(normalizeCurrency(' xaf ')).toBe('XAF')
    expect(normalizeCurrency('USD')).toBe('USD')
  })

  it('keeps any 3-letter ISO-style code Intl accepts', () => {
    // Intl doesn't throw for unknown 3-letter codes — it renders code+amount.
    expect(normalizeCurrency('ZZZ')).toBe('ZZZ')
  })
})

describe('formatCurrency', () => {
  it('renders a value for a valid currency', () => {
    expect(formatCurrency(12500, 'XOF')).toContain('1')
    expect(formatCurrency(12500, 'EUR')).toContain('1')
  })

  it('sanitizes corrupt input', () => {
    expect(formatCurrency(Number.NaN)).toContain('0')
    expect(formatCurrency(Number.POSITIVE_INFINITY)).toContain('0')
  })
})

describe('slugify', () => {
  it('lowercases, trims and fills separators', () => {
    expect(slugify('Chez Awa')).toBe('chez-awa')
    expect(slugify('  Café de la Paix  ')).toBe('cafe-de-la-paix')
    expect(slugify('Déjà Vu')).toBe('deja-vu')
  })

  it('drops leading/trailing separators and collapses duplicates', () => {
    expect(slugify('-hello--world-')).toBe('hello-world')
    expect(slugify('a  b')).toBe('a-b')
  })
})

describe('whatsappHref', () => {
  it('strips everything except digits', () => {
    expect(whatsappHref('+221 77 123 45 67')).toBe('https://wa.me/221771234567')
    expect(whatsappHref('+22133-123-4567')).toBe('https://wa.me/221331234567')
  })
})

describe('contrastWithWhite', () => {
  it('returns 21:1 for pure black', () => {
    expect(contrastWithWhite('#000000')).toBeCloseTo(21, 1)
  })

  it('returns 1:1 for white (no contrast)', () => {
    expect(contrastWithWhite('#ffffff')).toBeCloseTo(1, 1)
  })

  it('never warns on invalid input', () => {
    expect(contrastWithWhite('not-a-color')).toBe(21)
  })
})

describe('delivery fees', () => {
  const shop = { delivery_fee: 2000, free_delivery_threshold: 5000 }

  it('applies the fee below the free-delivery threshold', () => {
    expect(resolveDeliveryFee(shop, 4000)).toBe(2000)
  })

  it('waives the fee at/above the threshold', () => {
    expect(resolveDeliveryFee(shop, 5000)).toBe(0)
    expect(resolveDeliveryFee(shop, 7500)).toBe(0)
  })

  it('never returns a negative fee', () => {
    expect(resolveDeliveryFee({ delivery_fee: -50, free_delivery_threshold: null }, 100)).toBe(0)
  })

  it('applies zone fees with the shop threshold', () => {
    expect(resolveZoneDeliveryFee(shop, 4000, 1500)).toBe(1500)
    expect(resolveZoneDeliveryFee(shop, 6000, 1500)).toBe(0)
  })
})