import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { firstNameOf, runOnboardingNudges, type NudgeCandidate } from './onboardingNudge.js'
import { onboardingNudgeEmailHtml } from './emailTemplates.js'

/** Faux client : `rpc` renvoie les candidats, `onboarding_nudges` mémorise les lignes réclamées. */
function fakeAdmin(candidates: NudgeCandidate[], { alreadyClaimed = new Set<string>() } = {}) {
  const claimed = new Set<string>(alreadyClaimed)
  const client = {
    rpc: vi.fn(async () => ({ data: candidates, error: null })),
    from: vi.fn(() => ({
      insert: async ({ user_id }: { user_id: string }) => {
        if (claimed.has(user_id)) return { error: { message: 'duplicate key' } }
        claimed.add(user_id)
        return { error: null }
      },
      delete: () => ({
        eq: async (_column: string, userId: string) => {
          claimed.delete(userId)
          return { error: null }
        },
      }),
    })),
  }
  return { admin: client as unknown as SupabaseClient, claimed, client }
}

const awa: NudgeCandidate = { user_id: 'u1', email: 'awa@example.sn', full_name: 'Awa Diop' }
const moussa: NudgeCandidate = { user_id: 'u2', email: 'moussa@example.sn', full_name: null }

describe('runOnboardingNudges', () => {
  it('envoie une relance par compte et les marque comme relancés', async () => {
    const { admin, claimed } = fakeAdmin([awa, moussa])
    const send = vi.fn(async (_email: { to: string; subject: string; html: string }) => {})
    const result = await runOnboardingNudges(admin, { origin: 'https://bitiko.shop', send })
    expect(result).toEqual({ candidates: 2, sent: 2, failed: 0 })
    expect(send).toHaveBeenCalledTimes(2)
    expect(send.mock.calls[0]![0].to).toBe('awa@example.sn')
    expect(claimed).toEqual(new Set(['u1', 'u2']))
  })

  it('ne relance jamais un compte déjà réclamé (exécutions simultanées)', async () => {
    const { admin } = fakeAdmin([awa], { alreadyClaimed: new Set(['u1']) })
    const send = vi.fn(async () => {})
    const result = await runOnboardingNudges(admin, { origin: 'https://bitiko.shop', send })
    expect(send).not.toHaveBeenCalled()
    expect(result).toEqual({ candidates: 1, sent: 0, failed: 1 })
  })

  it('libère le compte si l’envoi échoue, pour un nouvel essai au prochain passage', async () => {
    const { admin, claimed } = fakeAdmin([awa, moussa])
    const send = vi.fn(async ({ to }: { to: string }) => {
      if (to === 'awa@example.sn') throw new Error('resend down')
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await runOnboardingNudges(admin, { origin: 'https://bitiko.shop', send })
    expect(result).toEqual({ candidates: 2, sent: 1, failed: 1 })
    expect(claimed.has('u1')).toBe(false)
    expect(claimed.has('u2')).toBe(true)
  })

  it('remonte l’erreur si la liste des candidats est illisible', async () => {
    const admin = { rpc: async () => ({ data: null, error: new Error('rpc indisponible') }) } as unknown as SupabaseClient
    await expect(runOnboardingNudges(admin, { origin: 'https://bitiko.shop', send: async () => {} })).rejects.toThrow(/rpc indisponible/)
  })
})

describe('firstNameOf', () => {
  it('garde le premier mot du nom', () => {
    expect(firstNameOf('Awa Marie Diop')).toBe('Awa')
    expect(firstNameOf('  Moussa ')).toBe('Moussa')
    expect(firstNameOf('')).toBeNull()
    expect(firstNameOf(null)).toBeNull()
  })
})

describe('onboardingNudgeEmailHtml', () => {
  it('pointe vers la création de boutique et échappe le prénom', () => {
    const html = onboardingNudgeEmailHtml({ origin: 'https://bitiko.shop', firstName: '<b>Awa</b>' })
    expect(html).toContain('https://bitiko.shop/admin/onboarding')
    expect(html).not.toContain('<b>Awa</b>')
    expect(html).toContain('&lt;b&gt;Awa')
  })

  it('reste correct sans prénom', () => {
    const html = onboardingNudgeEmailHtml({ origin: 'https://bitiko.shop', firstName: null })
    expect(html).toContain('ta boutique est à une minute')
  })
})
