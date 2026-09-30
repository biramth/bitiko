import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SESSION_TTL_MS,
  analyticsSessionKey,
  extractReferrerHost,
  getSessionId,
  stripTrackingParams,
} from '@/lib/selfAnalytics'

function installWindowStub(): Storage {
  const store = new Map<string, string>()
  const storage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, v)
    },
    removeItem: (k: string) => {
      store.delete(k)
    },
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size
    },
  } as Storage
  vi.stubGlobal('window', { localStorage: storage })
  return storage
}

describe('selfAnalytics CNIL', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    installWindowStub()
  })

  it('session cloisonnée par boutique', () => {
    expect(analyticsSessionKey('shop-a')).not.toBe(analyticsSessionKey('shop-b'))
    expect(analyticsSessionKey('shop-a')).not.toBe(analyticsSessionKey('plateforme'))
  })

  it('même session réutilisée pendant 6 mois, sans renouvellement glissant', () => {
    const first = getSessionId('shop-a')
    expect(first).toBeTruthy()
    const second = getSessionId('shop-a')
    expect(second).toBe(first)
    // Pas de sliding : la date d'origine est conservée telle quelle.
    const raw = window.localStorage.getItem(analyticsSessionKey('shop-a'))!
    const at = (JSON.parse(raw) as { at: number }).at
    expect(Date.now() - at).toBeLessThan(5000)
  })

  it('session expirée : nouvel identifiant', () => {
    window.localStorage.setItem(
      analyticsSessionKey('shop-a'),
      JSON.stringify({ id: 'ancien-id', at: Date.now() - SESSION_TTL_MS - 1000 }),
    )
    const id = getSessionId('shop-a')
    expect(id).toBeTruthy()
    expect(id).not.toBe('ancien-id')
  })

  it('path sans query ni ancre', () => {
    expect(stripTrackingParams('/produits?utm_source=x&boutique=y')).toBe('/produits')
    expect(stripTrackingParams('/reserver#section')).toBe('/reserver')
    expect(stripTrackingParams('/')).toBe('/')
  })

  it('referrer réduit à l’hôte', () => {
    expect(extractReferrerHost('https://www.google.com/search?q=bitiko')).toBe('www.google.com')
    expect(extractReferrerHost('http://localhost:5173/')).toBe('localhost')
    expect(extractReferrerHost('')).toBeNull()
    expect(extractReferrerHost('pas-une-url')).toBeNull()
  })
})
