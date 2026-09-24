import { describe, expect, it, vi, afterEach } from 'vitest'
import { isPasswordBreached } from './password'

// SHA-1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8 — a famously
// breached password, so the suite uses the real prefix/suffix shape.
const BREACHED_SUFFIX = '1E4C9B93F3F0682250B6CF8331B7EE68FD8'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('isPasswordBreached', () => {
  it('returns false without calling the network for an empty password', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await isPasswordBreached('')).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('detects a breached password from the k-anonymity response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(`0018A45C4D1DEF81644B54AB6FF90123A:D\n${BREACHED_SUFFIX}:9541253\n`),
      }),
    )
    expect(await isPasswordBreached('password')).toBe(true)
  })

  it('passes a password absent from the response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('0018A45C4D1DEF81644B54AB6FF90123A:2\n') }),
    )
    expect(await isPasswordBreached('password')).toBe(false)
  })

  it('fails open when the API is down', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, text: () => Promise.resolve('') }),
    )
    expect(await isPasswordBreached('password')).toBe(false)
  })
})
