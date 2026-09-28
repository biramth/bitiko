import { describe, expect, it } from 'vitest'
import { badgeForProduct, badgeForService, isPromoLive, sitePromos } from './promoTargeting'
import type { ShopPromo } from '@/types/cms'

const base: ShopPromo = {
  id: 'p1',
  shop_id: 's1',
  title: 'Soldes',
  body: null,
  button_label: null,
  button_link: null,
  image_url: null,
  badge_label: '-20%',
  scope: 'site',
  product_id: null,
  category_id: null,
  service_id: null,
  starts_at: null,
  ends_at: null,
  is_active: true,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const now = new Date('2026-06-15T12:00:00Z')

describe('isPromoLive', () => {
  it('accepte une promo active sans dates', () => {
    expect(isPromoLive(base, now)).toBe(true)
  })

  it('refuse les inactives et hors fenêtre', () => {
    expect(isPromoLive({ ...base, is_active: false }, now)).toBe(false)
    expect(isPromoLive({ ...base, starts_at: '2026-07-01T00:00:00Z' }, now)).toBe(false)
    expect(isPromoLive({ ...base, ends_at: '2026-06-01T00:00:00Z' }, now)).toBe(false)
    expect(isPromoLive({ ...base, starts_at: '2026-06-01T00:00:00Z', ends_at: '2026-07-01T00:00:00Z' }, now)).toBe(true)
  })
})

describe('badgeForProduct', () => {
  const product = { id: 'prod-1', category: { id: 'cat-1' } as { id: string } }

  it('préfère le ciblage direct produit', () => {
    const promos = [
      { ...base, id: 'c', scope: 'category' as const, category_id: 'cat-1', badge_label: '-10%' },
      { ...base, id: 'd', scope: 'product' as const, product_id: 'prod-1', badge_label: '-30%' },
    ]
    expect(badgeForProduct(promos, product, now)).toBe('-30%')
  })

  it('retombe sur la catégorie puis rien', () => {
    const category = [{ ...base, id: 'c', scope: 'category' as const, category_id: 'cat-1', badge_label: '-10%' }]
    expect(badgeForProduct(category, product, now)).toBe('-10%')
    expect(badgeForProduct([], product, now)).toBeNull()
    expect(badgeForProduct(category, { id: 'prod-9', category: null }, now)).toBeNull()
  })

  it('ignore les promos sans pastille et hors dates', () => {
    const promos = [
      { ...base, id: 'n', scope: 'product' as const, product_id: 'prod-1', badge_label: null },
      { ...base, id: 'e', scope: 'product' as const, product_id: 'prod-1', badge_label: '-50%', ends_at: '2026-01-01T00:00:00Z' },
    ]
    expect(badgeForProduct(promos, product, now)).toBeNull()
  })
})

describe('badgeForService', () => {
  it('cible direct puis catégorie', () => {
    const promos = [
      { ...base, id: 'c', scope: 'category' as const, category_id: 'cat-9', badge_label: '-10%' },
      { ...base, id: 'd', scope: 'service' as const, service_id: 'srv-1', badge_label: '-25%' },
    ]
    expect(badgeForService(promos, { id: 'srv-1', categoryId: 'cat-9' }, now)).toBe('-25%')
    expect(badgeForService(promos, { id: 'srv-2', categoryId: 'cat-9' }, now)).toBe('-10%')
    expect(badgeForService(promos, { id: 'srv-3' }, now)).toBeNull()
  })
})

describe('sitePromos', () => {
  it('ne garde que le scope site en vie', () => {
    const promos = [
      base,
      { ...base, id: 'd', scope: 'product' as const, product_id: 'x' },
      { ...base, id: 'o', is_active: false },
    ]
    expect(sitePromos(promos, now).map((p) => p.id)).toEqual(['p1'])
  })
})
