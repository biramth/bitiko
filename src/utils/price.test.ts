import { describe, expect, it } from 'vitest'
import { normalizePrice, validatePrice } from './price'

describe('normalizePrice', () => {
  it('accepts a plain integer', () => {
    expect(normalizePrice('3000')).toEqual({ ok: true, value: 3000 })
  })

  it('accepts a space thousands separator', () => {
    expect(normalizePrice('3 000')).toEqual({ ok: true, value: 3000 })
  })

  it('accepts a comma thousands separator', () => {
    expect(normalizePrice('3,000')).toEqual({ ok: true, value: 3000 })
  })

  it('accepts a dot thousands separator', () => {
    expect(normalizePrice('3.000')).toEqual({ ok: true, value: 3000 })
  })

  it('accepts multi-group thousands separators', () => {
    expect(normalizePrice('1,234,567')).toEqual({ ok: true, value: 1234567 })
    expect(normalizePrice('1.234.567')).toEqual({ ok: true, value: 1234567 })
  })

  it('strips the "FCFA" unit suffix', () => {
    expect(normalizePrice('3000 FCFA')).toEqual({ ok: true, value: 3000 })
    expect(normalizePrice('3 000 FCFA')).toEqual({ ok: true, value: 3000 })
  })

  it('strips the "f" unit suffix with no space', () => {
    expect(normalizePrice('3000f')).toEqual({ ok: true, value: 3000 })
  })

  it('strips the "F CFA" unit suffix', () => {
    expect(normalizePrice('3000 F CFA')).toEqual({ ok: true, value: 3000 })
  })

  it('rejects an empty value', () => {
    expect(normalizePrice('')).toEqual({ ok: false, value: null, error: 'empty' })
    expect(normalizePrice('   ')).toEqual({ ok: false, value: null, error: 'empty' })
  })

  it('rejects a negative value', () => {
    expect(normalizePrice('-3000')).toEqual({ ok: false, value: null, error: 'negative' })
    expect(normalizePrice(-100)).toEqual({ ok: false, value: null, error: 'negative' })
  })

  it('rejects invalid characters', () => {
    expect(normalizePrice('abc')).toEqual({ ok: false, value: null, error: 'invalid' })
    expect(normalizePrice('12@34')).toEqual({ ok: false, value: null, error: 'invalid' })
  })

  it('rejects decimals by default, without mangling the value', () => {
    // A genuine decimal must never be reinterpreted as a thousands group.
    const result = normalizePrice('3.5')
    expect(result.ok).toBe(false)
    expect(result.error).toBe('decimal_not_allowed')
  })

  it('rejects a comma decimal by default', () => {
    expect(normalizePrice('3,5')).toMatchObject({ ok: false, error: 'decimal_not_allowed' })
  })

  it('accepts decimals when explicitly allowed', () => {
    expect(normalizePrice('3.5', { allowDecimals: true })).toEqual({ ok: true, value: 3.5 })
    expect(normalizePrice('3,5', { allowDecimals: true })).toEqual({ ok: true, value: 3.5 })
  })

  it('accepts a numeric input directly', () => {
    expect(normalizePrice(3000)).toEqual({ ok: true, value: 3000 })
  })

  it('rejects non-finite numeric input', () => {
    expect(normalizePrice(Number.NaN)).toEqual({ ok: false, value: null, error: 'invalid' })
    expect(normalizePrice(Number.POSITIVE_INFINITY)).toEqual({ ok: false, value: null, error: 'invalid' })
  })

  it('accepts zero (free item)', () => {
    expect(normalizePrice('0')).toEqual({ ok: true, value: 0 })
  })

  it('handles a mixed thousands+decimal format when decimals are allowed', () => {
    expect(normalizePrice('1,234,567.89', { allowDecimals: true })).toEqual({ ok: true, value: 1234567.89 })
  })
})

describe('validatePrice', () => {
  it('mirrors normalizePrice ok status', () => {
    expect(validatePrice('3 000 FCFA')).toBe(true)
    expect(validatePrice('abc')).toBe(false)
    expect(validatePrice('3.5')).toBe(false)
  })
})
