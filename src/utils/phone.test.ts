import { describe, expect, it } from 'vitest'
import { formatPhoneNumberForDisplay, normalizePhoneNumber, validatePhoneNumber } from './phone'

describe('normalizePhoneNumber', () => {
  it('normalizes a plain national number', () => {
    expect(normalizePhoneNumber('771234567')).toEqual({ ok: true, value: '+221771234567' })
  })

  it('normalizes a national number with spaces', () => {
    expect(normalizePhoneNumber('77 123 45 67')).toEqual({ ok: true, value: '+221771234567' })
  })

  it('normalizes a national number with dashes', () => {
    expect(normalizePhoneNumber('77-123-45-67')).toEqual({ ok: true, value: '+221771234567' })
  })

  it('normalizes an international +221 number with spaces', () => {
    expect(normalizePhoneNumber('+221 77 123 45 67')).toEqual({ ok: true, value: '+221771234567' })
  })

  it('normalizes an international +221 number with no spaces', () => {
    expect(normalizePhoneNumber('+221771234567')).toEqual({ ok: true, value: '+221771234567' })
  })

  it('normalizes the 00221 international prefix', () => {
    expect(normalizePhoneNumber('00221 77 123 45 67')).toEqual({ ok: true, value: '+221771234567' })
    expect(normalizePhoneNumber('00221771234567')).toEqual({ ok: true, value: '+221771234567' })
  })

  it('normalizes a leading trunk 0', () => {
    expect(normalizePhoneNumber('0771234567')).toEqual({ ok: true, value: '+221771234567' })
  })

  it('accepts a fixed-line number starting with 3', () => {
    expect(normalizePhoneNumber('33 123 45 67')).toEqual({ ok: true, value: '+221331234567' })
  })

  it('treats +221 and local formats of the same number as identical', () => {
    const a = normalizePhoneNumber('+221771234567')
    const b = normalizePhoneNumber('77 123 45 67')
    expect(a.value).toBe(b.value)
  })

  it('rejects an empty value', () => {
    expect(normalizePhoneNumber('')).toEqual({ ok: false, value: null, error: 'empty' })
    expect(normalizePhoneNumber('   ')).toEqual({ ok: false, value: null, error: 'empty' })
  })

  it('rejects a number that is too short', () => {
    expect(normalizePhoneNumber('7712345')).toMatchObject({ ok: false, value: null })
  })

  it('rejects a number that is too long', () => {
    expect(normalizePhoneNumber('771234567890')).toMatchObject({ ok: false, value: null })
  })

  it('rejects an invalid prefix (not mobile/fixed)', () => {
    expect(normalizePhoneNumber('991234567')).toMatchObject({ ok: false, value: null, error: 'invalid_prefix' })
  })

  it('rejects unexpected characters', () => {
    expect(normalizePhoneNumber('77-ABC-45-67')).toMatchObject({ ok: false, value: null, error: 'invalid_characters' })
  })

  it('never silently mangles an invalid number into something plausible', () => {
    const result = normalizePhoneNumber('123')
    expect(result.ok).toBe(false)
    expect(result.value).toBeNull()
  })
})

describe('validatePhoneNumber', () => {
  it('mirrors normalizePhoneNumber ok status', () => {
    expect(validatePhoneNumber('77 123 45 67')).toBe(true)
    expect(validatePhoneNumber('123')).toBe(false)
  })
})

describe('formatPhoneNumberForDisplay', () => {
  it('groups the canonical number for readability', () => {
    expect(formatPhoneNumberForDisplay('+221771234567')).toBe('+221 77 123 45 67')
  })

  it('returns the input unchanged if not canonical', () => {
    expect(formatPhoneNumberForDisplay('not-a-number')).toBe('not-a-number')
  })
})
