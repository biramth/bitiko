import { describe, expect, it } from 'vitest'
import type { ShopSubscription } from '../types/billing.js'
import { PLANS, canAddProduct, canAddSection, effectivePlan, effectivePlanKey } from './plans'

const subscription = (overrides: Partial<ShopSubscription>): ShopSubscription => ({
  shop_id: 'test-shop',
  updated_at: new Date().toISOString(),
  plan: 'pro',
  status: 'active',
  current_period_end: new Date(Date.now() + 60_000).toISOString(),
  ...overrides,
})

describe('effectivePlanKey', () => {
  it('is free without a subscription', () => {
    expect(effectivePlanKey(null)).toBe('free')
    expect(effectivePlanKey(undefined)).toBe('free')
  })

  it('is free on a lapsed Pro subscription', () => {
    const expired = subscription({ current_period_end: new Date(Date.now() - 1).toISOString() })
    expect(effectivePlanKey(expired)).toBe('free')
  })

  it('is pro while the subscription is in force', () => {
    expect(effectivePlanKey(subscription({}))).toBe('pro')
  })
})

describe('effectivePlan', () => {
  it('defaults to the free plan', () => {
    const plan = effectivePlan(null)
    expect(plan.key).toBe('free')
    expect(plan.maxActiveProducts).toBe(8)
    expect(plan.storeBuilderAccess).toBe(false)
  })
})

describe('canAddProduct', () => {
  it('blocks the free plan at its 8-product cap', () => {
    expect(canAddProduct(PLANS.free, 8)).toBe(false)
    expect(canAddProduct(PLANS.free, 7)).toBe(true)
    expect(canAddProduct(PLANS.free, 0)).toBe(true)
  })

  it('never blocks the Pro plan', () => {
    expect(canAddProduct(PLANS.pro, 999)).toBe(true)
  })
})

describe('canAddSection', () => {
  it('blocks the free plan at its content-block cap', () => {
    expect(canAddSection(PLANS.free, 3)).toBe(false)
    expect(canAddSection(PLANS.free, 2)).toBe(true)
    expect(canAddSection(PLANS.free, 0)).toBe(true)
  })

  it('never blocks the Pro plan', () => {
    expect(canAddSection(PLANS.pro, 999)).toBe(true)
  })
})