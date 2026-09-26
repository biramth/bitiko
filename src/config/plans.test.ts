import { describe, expect, it } from 'vitest'
import type { ShopSubscription } from '../types/billing.js'
import {
  PLANS,
  canAddProduct,
  canAddProductImage,
  canAddSection,
  canAddService,
  canAddTeamMember,
  canAddVariant,
  effectivePlan,
  effectivePlanKey,
} from './plans'

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
    // Mirrors public.plan_limits (single source is the DB trigger) — see plans.ts.
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

describe('canAddSection', () => {
  it('blocks the free plan at its 3-content-block cap', () => {
    expect(canAddSection(PLANS.free, 3)).toBe(false)
    expect(canAddSection(PLANS.free, 2)).toBe(true)
    expect(canAddSection(PLANS.free, 0)).toBe(true)
  })

  it('gives the Essential plan more room than free', () => {
    expect(canAddSection(PLANS.essential, 9)).toBe(true)
    expect(canAddSection(PLANS.essential, 10)).toBe(false)
  })

  it('never blocks the Pro plan', () => {
    expect(canAddSection(PLANS.pro, 999)).toBe(true)
  })
})

describe('canAddProductImage', () => {
  it('shares the free plan 4-photo budget between gallery and variant photos', () => {
    // 0 main + 0 variant photos → 1 more OK; 3 main + 1 variant → blocked.
    expect(canAddProductImage(PLANS.free, 0, 0)).toBe(true)
    expect(canAddProductImage(PLANS.free, 2, 0)).toBe(true)
    expect(canAddProductImage(PLANS.free, 3, 1)).toBe(false)
    expect(canAddProductImage(PLANS.free, 4, 0)).toBe(false)
    expect(canAddProductImage(PLANS.free, 0, 4)).toBe(false)
  })

  it('never limits paid plans', () => {
    expect(canAddProductImage(PLANS.essential, 999, 999)).toBe(true)
    expect(canAddProductImage(PLANS.pro, 999, 999)).toBe(true)
  })
})

describe('canAddVariant', () => {
  it('caps the free plan at 2 variants', () => {
    expect(canAddVariant(PLANS.free, 0)).toBe(true)
    expect(canAddVariant(PLANS.free, 1)).toBe(true)
    expect(canAddVariant(PLANS.free, 2)).toBe(false)
  })

  it('never limits paid plans', () => {
    expect(canAddVariant(PLANS.essential, 999)).toBe(true)
    expect(canAddVariant(PLANS.pro, 999)).toBe(true)
  })
})
describe('plafonds métiers de service', () => {
  it('free < essentiel < pro, pro illimité', () => {
    expect(PLANS.free.maxActiveServices).toBe(6)
    expect(PLANS.essential.maxActiveServices).toBe(30)
    expect(PLANS.pro.maxActiveServices).toBeNull()
    expect(PLANS.free.maxTeamMembers).toBe(2)
    expect(PLANS.pro.maxMonthlyBookings).toBeNull()
  })

  it('canAddService / canAddTeamMember respectent le plafond', () => {
    expect(canAddService(PLANS.free, 5)).toBe(true)
    expect(canAddService(PLANS.free, 6)).toBe(false)
    expect(canAddService(PLANS.pro, 10_000)).toBe(true)
    expect(canAddTeamMember(PLANS.free, 2)).toBe(false)
    expect(canAddTeamMember(PLANS.essential, 7)).toBe(true)
  })
})

describe('outils de gestion par plan', () => {
  it('l’export (CSV + PDF, généré dans le navigateur) est ouvert à tous ; l’historique, la comparaison et les saisies différencient les plans', () => {
    expect(PLANS.free.financeHistoryMonths).toBe(1)
    expect(PLANS.free.financeExport).toBe('pdf')
    expect(PLANS.essential.financeExport).toBe('pdf')
    expect(PLANS.free.maxMonthlyFinanceEntries).toBe(30)
    expect(PLANS.essential.financeHistoryMonths).toBe(12)
    expect(PLANS.essential.maxMonthlyFinanceEntries).toBeNull()
    expect(PLANS.pro.financeExport).toBe('pdf')
    expect(PLANS.pro.financeHistoryMonths).toBeNull()
    expect(PLANS.pro.financeComparison).toBe(true)
  })
})
