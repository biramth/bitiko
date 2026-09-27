import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL_ENV = { ...process.env }

async function freshModule() {
  vi.resetModules()
  return import('./posthogQuery.js')
}

describe('posthogQuery', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    vi.unstubAllGlobals()
  })

  it('isPostHogConfigured reflète la présence des deux variables', async () => {
    delete process.env.POSTHOG_PERSONAL_API_KEY
    delete process.env.POSTHOG_PROJECT_ID
    const { isPostHogConfigured: notConfigured } = await freshModule()
    expect(notConfigured()).toBe(false)

    process.env.POSTHOG_PERSONAL_API_KEY = 'phx_test'
    process.env.POSTHOG_PROJECT_ID = '285741'
    const { isPostHogConfigured: configured } = await freshModule()
    expect(configured()).toBe(true)
  })

  it('runHogQL refuse sans configuration, sans appeler fetch', async () => {
    delete process.env.POSTHOG_PERSONAL_API_KEY
    delete process.env.POSTHOG_PROJECT_ID
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const { runHogQL } = await freshModule()
    await expect(runHogQL('select 1')).rejects.toThrow(/pas configuré/)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('runHogQL appelle le bon hôte régional et recompose colonnes/lignes en objets', async () => {
    process.env.POSTHOG_PERSONAL_API_KEY = 'phx_test'
    process.env.POSTHOG_PROJECT_ID = '285741'
    process.env.POSTHOG_API_HOST = 'https://eu.posthog.com'
    const fetchSpy = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe('https://eu.posthog.com/api/projects/285741/query/')
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer phx_test')
      const sent = JSON.parse(init.body as string)
      expect(sent.query.kind).toBe('HogQLQuery')
      expect(sent.query.query).toContain('select event')
      return {
        ok: true,
        status: 200,
        json: async () => ({ columns: ['event', 'n'], results: [['shop_created', 12], ['onboarding_started', 40]] }),
      }
    })
    vi.stubGlobal('fetch', fetchSpy)
    const { runHogQL } = await freshModule()
    const rows = await runHogQL<{ event: string; n: number }>('select event, count() as n from events')
    expect(rows).toEqual([{ event: 'shop_created', n: 12 }, { event: 'onboarding_started', n: 40 }])
  })

  it('runHogQL relaie le message d’erreur de PostHog', async () => {
    process.env.POSTHOG_PERSONAL_API_KEY = 'phx_test'
    process.env.POSTHOG_PROJECT_ID = '285741'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 400, json: async () => ({ detail: 'requête HogQL invalide' }) })),
    )
    const { runHogQL } = await freshModule()
    await expect(runHogQL('select nawak')).rejects.toThrow('requête HogQL invalide')
  })
})
