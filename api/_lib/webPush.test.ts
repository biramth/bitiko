import { describe, expect, it } from 'vitest'
import { isExpiredPushError, pushPayload } from './webPush.js'

describe('pushPayload', () => {
  it('borne le titre et le texte', () => {
    const payload = JSON.parse(pushPayload({ title: 'T'.repeat(500), body: 'B'.repeat(1000), url: '/admin/commandes', tag: 'e1' }))
    expect(payload.title).toHaveLength(120)
    expect(payload.body).toHaveLength(300)
    expect(payload.body.endsWith('…')).toBe(true)
    expect(payload).toMatchObject({ url: '/admin/commandes', tag: 'e1' })
  })

  it('n’ouvre jamais une adresse externe', () => {
    expect(JSON.parse(pushPayload({ title: 'a', body: 'b', url: 'https://example.com' })).url).toBe('/admin')
  })
})

describe('isExpiredPushError', () => {
  it('reconnaît un abonnement disparu', () => {
    expect(isExpiredPushError({ statusCode: 410 })).toBe(true)
    expect(isExpiredPushError({ statusCode: 404 })).toBe(true)
    expect(isExpiredPushError({ statusCode: 500 })).toBe(false)
    expect(isExpiredPushError(null)).toBe(false)
  })
})
