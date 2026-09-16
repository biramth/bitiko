import { describe, expect, it } from 'vitest'
import { isValidSlug, resolveTenant } from './tenant'

describe('resolveTenant', () => {
  it('resolves ?boutique=<slug> from any host', () => {
    expect(resolveTenant('localhost', '?boutique=ma-boutique')).toEqual({
      type: 'shop',
      slug: 'ma-boutique',
    })
    expect(resolveTenant('dem.boutique.bitiko.shop', '?boutique=toto/')).toEqual({
      type: 'shop',
      slug: 'toto',
    })
    expect(resolveTenant('bitiko.shop', '?boutique=foo')).toEqual({ type: 'shop', slug: 'foo' })
  })

  it('uses VITE_DEV_SHOP_SLUG on local hosts', () => {
    expect(resolveTenant('localhost', '')).toEqual({ type: 'shop', slug: 'demo' })
    expect(resolveTenant('127.0.0.1', '')).toEqual({ type: 'shop', slug: 'demo' })
  })

  it('treats the root domain and its www as the platform', () => {
    expect(resolveTenant('bitiko.shop', '')).toEqual({ type: 'platform' })
    expect(resolveTenant('www.bitiko.shop', '')).toEqual({ type: 'platform' })
  })

  it('treats Vercel preview hosts as the platform', () => {
    expect(resolveTenant('bitiko-abc123.vercel.app', '')).toEqual({ type: 'platform' })
  })

  it('resolves <slug>.<root> subdomains to a shop', () => {
    expect(resolveTenant('chez-awa.bitiko.shop', '')).toEqual({ type: 'shop', slug: 'chez-awa' })
  })

  it('falls back to treating any unknown host as a shop slug', () => {
    expect(resolveTenant('some-random-host.example', '')).toEqual({
      type: 'shop',
      slug: 'some-random-host.example',
    })
  })
})

describe('isValidSlug', () => {
  it('accepts well-formed slugs', () => {
    expect(isValidSlug('chez-awa')).toBe(true)
    expect(isValidSlug('ma-boutique-123')).toBe(true)
  })

  it('rejects short, reserved, spaced or uppercased slugs', () => {
    expect(isValidSlug('ab')).toBe(false)
    expect(isValidSlug('admin')).toBe(false)
    expect(isValidSlug('www')).toBe(false)
    expect(isValidSlug('has space')).toBe(false)
    expect(isValidSlug('Démo')).toBe(false)
    expect(isValidSlug('-starts-with-dash')).toBe(false)
  })
})