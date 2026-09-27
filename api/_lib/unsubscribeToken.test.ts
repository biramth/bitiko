import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildUnsubscribeUrl, isValidUnsubscribeToken, signUnsubscribeToken } from './unsubscribeToken.js'

const ORIGINAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

describe('unsubscribeToken', () => {
  beforeEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  })
  afterEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = ORIGINAL_KEY
  })

  const USER = '00000000-0000-0000-0000-0000000000a1'
  const OTHER = '00000000-0000-0000-0000-0000000000a2'

  it('accepte le jeton signé pour le bon utilisateur', () => {
    const token = signUnsubscribeToken(USER)
    expect(isValidUnsubscribeToken(USER, token)).toBe(true)
  })

  it('refuse le jeton d’un autre utilisateur (pas de désabonnement à sa place)', () => {
    const token = signUnsubscribeToken(USER)
    expect(isValidUnsubscribeToken(OTHER, token)).toBe(false)
  })

  it('refuse un jeton altéré ou mal formé', () => {
    const token = signUnsubscribeToken(USER)
    expect(isValidUnsubscribeToken(USER, `${token.slice(0, -1)}0`)).toBe(false)
    expect(isValidUnsubscribeToken(USER, 'pas-du-tout-hex-!!')).toBe(false)
    expect(isValidUnsubscribeToken(USER, '')).toBe(false)
  })

  it('construit une URL avec l’utilisateur et le jeton', () => {
    const url = buildUnsubscribeUrl('https://bitiko.shop', USER)
    expect(url.startsWith('https://bitiko.shop/api/campaigns/unsubscribe?u=')).toBe(true)
    const parsed = new URL(url)
    expect(parsed.searchParams.get('u')).toBe(USER)
    expect(isValidUnsubscribeToken(USER, parsed.searchParams.get('t')!)).toBe(true)
  })
})
