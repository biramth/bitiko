import { describe, expect, it } from 'vitest'
import { DEFAULT_COUNTRY_CODE, getCountryPreset, phonePlaceholder } from '@/config/countries'
import { formatPhoneNumberForDisplay, normalizePhoneNumber, validatePhoneInput, validatePhoneNumber } from './phone'

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

describe('normalizePhoneNumber — autres pays', () => {
  const n = (phone: string, country: string) => normalizePhoneNumber(phone, country).value

  it('France : international en 00, avec « 0 » de ligne et national', () => {
    expect(n('0033601234567', 'FR')).toBe('+33601234567')
    expect(n('+33601234567', 'FR')).toBe('+33601234567')
    expect(n('601234567', 'FR')).toBe('+33601234567')
    expect(n('0601234567', 'FR')).toBe('+33601234567')
  })

  it('Côte d’Ivoire : national à 8 chiffres', () => {
    expect(n('+22512345678', 'CI')).toBe('+22512345678')
    expect(n('012345678', 'CI')).toBe('+22512345678')
    expect(n('12345678', 'CI')).toBe('+22512345678')
  })

  it('Nigeria : national à 10 chiffres', () => {
    expect(n('+2347012345678', 'NG')).toBe('+2347012345678')
    expect(n('7012345678', 'NG')).toBe('+2347012345678')
  })

  it('un pays inconnu retombe sur le Sénégal', () => {
    expect(n('771234567', 'XX')).toBe('+221771234567')
  })

  it('refuse un indicatif étranger dans une boutique d’un autre pays (comme le serveur)', () => {
    expect(normalizePhoneNumber('+22512345678', 'SN').ok).toBe(false)
  })
})

describe('validatePhoneInput', () => {
  it('demande un numéro, valide ou explique pour le pays', () => {
    expect(validatePhoneInput('  ', DEFAULT_COUNTRY_CODE)).toBe('Le numéro de téléphone est requis.')
    expect(validatePhoneInput('+221771234567', 'SN')).toBeNull()
    expect(validatePhoneInput('+221551234567', 'SN')).toContain('Sénégal')
    expect(validatePhoneInput('+33601234567', 'FR')).toBeNull()
  })
})

describe('presets pays', () => {
  it('Sénégal par défaut et placeholder indicatif + longueur', () => {
    expect(getCountryPreset(null).code).toBe('SN')
    expect(getCountryPreset('ZZ').name).toBe('Sénégal')
    expect(phonePlaceholder('SN')).toBe('+221XXXXXXXXX')
    expect(phonePlaceholder('CI')).toBe('+225XXXXXXXX')
  })

  it('affiche les numéros non sénégalais groupés', () => {
    expect(formatPhoneNumberForDisplay('+22512345678')).toBe('+225 12 34 56 78')
  })
})
