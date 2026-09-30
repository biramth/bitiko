import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CONSENT_REOPEN_EVENT,
  CONSENT_STORAGE_KEY,
  CONSENT_TTL_MS,
  CONSENT_VERSION,
  getConsent,
  hasConsented,
  needsConsent,
  reopenConsent,
  setConsent,
} from '@/lib/cookieConsent'

function installWindowStub(): { events: Event[] } {
  const store = new Map<string, string>()
  const listeners = new Map<string, Set<(e: Event) => void>>()
  const events: Event[] = []
  const stub = {
    localStorage: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
      removeItem: (k: string) => {
        store.delete(k)
      },
      clear: () => store.clear(),
    },
    addEventListener: (type: string, fn: (e: Event) => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type)!.add(fn)
    },
    removeEventListener: (type: string, fn: (e: Event) => void) => {
      listeners.get(type)?.delete(fn)
    },
    dispatchEvent: (e: Event) => {
      events.push(e)
      listeners.get(e.type)?.forEach((fn) => fn(e))
      return true
    },
  }
  vi.stubGlobal('window', stub)
  return { events }
}

function rawStored(): unknown {
  const raw = (window as unknown as { localStorage: Storage }).localStorage.getItem(CONSENT_STORAGE_KEY)
  return raw ? JSON.parse(raw) : null
}

describe('cookieConsent', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    installWindowStub()
  })

  it('sans choix : consentement requis, mesure interdite', () => {
    expect(needsConsent()).toBe(true)
    expect(hasConsented()).toBe(false)
    expect(getConsent()).toBeNull()
  })

  it('accepter : choix valide conservé comme preuve', () => {
    const record = setConsent('accepted')
    expect(record.status).toBe('accepted')
    expect(record.version).toBe(CONSENT_VERSION)
    expect(needsConsent()).toBe(false)
    expect(hasConsented()).toBe(true)
    expect(rawStored()).toMatchObject({ status: 'accepted', version: CONSENT_VERSION })
  })

  it('refuser : choix valide, mesure interdite', () => {
    setConsent('rejected')
    expect(needsConsent()).toBe(false)
    expect(hasConsented()).toBe(false)
  })

  it('choix expiré (> 6 mois) : bannière ré-affichée', () => {
    ;(window as unknown as { localStorage: Storage }).localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        status: 'accepted',
        at: new Date(Date.now() - CONSENT_TTL_MS - 1000).toISOString(),
        version: CONSENT_VERSION,
      }),
    )
    expect(needsConsent()).toBe(true)
    expect(hasConsented()).toBe(false)
  })

  it('version obsolète ou contenu illisible : consentement requis', () => {
    const storage = (window as unknown as { localStorage: Storage }).localStorage
    storage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ status: 'accepted', at: new Date().toISOString(), version: CONSENT_VERSION + 1 }),
    )
    expect(needsConsent()).toBe(true)
    storage.setItem(CONSENT_STORAGE_KEY, 'pas-du-json')
    expect(needsConsent()).toBe(true)
  })

  it('retrait du consentement : choix oublié et réouverture demandée', () => {
    const { events } = installWindowStub()
    setConsent('accepted')
    reopenConsent()
    expect(rawStored()).toBeNull()
    expect(needsConsent()).toBe(true)
    expect(events.some((e) => e.type === CONSENT_REOPEN_EVENT)).toBe(true)
  })
})
