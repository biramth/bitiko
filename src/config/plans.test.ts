import { describe, expect, it } from 'vitest'
import type { ShopSubscription } from '../types/billing.js'
import { PLANS, canAddProduct, effectivePlan, effectivePlanKey } from './plans'

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

  it('keeps the active paid plan while it is in force', () => {
    expect(effectivePlanKey(subscription({}))).toBe('pro')
    expect(effectivePlanKey(subscription({ plan: 'essential' }))).toBe('essential')
  })
})

describe('effectivePlan', () => {
  it('defaults to the free plan', () => {
    const plan = effectivePlan(null)
    expect(plan.key).toBe('free')
    expect(plan.maxActiveProducts).toBe(8)
    expect(plan.storeBuilderAccess).toBe(true)
    expect(plan.advancedBuilder).toBe(false)
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

  it('limits the Essential plan at 50 products', () => {
    expect(canAddProduct(PLANS.essential, 49)).toBe(true)
    expect(canAddProduct(PLANS.essential, 50)).toBe(false)
  })
})