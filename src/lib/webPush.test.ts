import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabaseClient', () => ({ supabase: {} }))

describe('urlBase64ToUint8Array', () => {
  it('décode une clé base64url sans remplissage', async () => {
    const { urlBase64ToUint8Array } = await import('./webPush')
    expect([...urlBase64ToUint8Array('-_8')]).toEqual([251, 255])
    expect([...urlBase64ToUint8Array('AQID')]).toEqual([1, 2, 3])
  })
})
