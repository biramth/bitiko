// Relative import (not the `@/` alias): this file is also imported directly
// from api/ serverless functions, which don't share Vite's alias resolution.
import type { PlanKey, ShopSubscription } from '../types/billing.js'

export type { PlanKey }

export interface Plan {
  key: PlanKey
  label: string
  priceXof: number
  maxActiveProducts: number | null
  storeBuilderAccess: boolean
  removableBranding: boolean
}

export const PLANS: Record<PlanKey, Plan> = {
  free: {
    key: 'free',
    label: 'Découverte',
    priceXof: 0,
    maxActiveProducts: 8,
    storeBuilderAccess: false,
    removableBranding: false,
  },
  pro: {
    key: 'pro',
    label: 'Pro',
    priceXof: 10_000,
    maxActiveProducts: null,
    storeBuilderAccess: true,
    removableBranding: true,
  },
}

/**
 * A subscription is only "in force" while its period hasn't lapsed — no
 * downgrade cron needed, an expired Pro subscription just silently reads
 * back as free everywhere this is checked.
 */
export function effectivePlanKey(subscription: ShopSubscription | null | undefined): PlanKey {
  if (!subscription) return 'free'
  if (subscription.plan === 'free') return 'free'
  if (!subscription.current_period_end) return 'free'
  return new Date(subscription.current_period_end).getTime() > Date.now() ? 'pro' : 'free'
}

export function effectivePlan(subscription: ShopSubscription | null | undefined): Plan {
  return PLANS[effectivePlanKey(subscription)]
}

export function canAddProduct(plan: Plan, currentActiveCount: number): boolean {
  return plan.maxActiveProducts === null || currentActiveCount < plan.maxActiveProducts
}

/**
 * Wave's Checkout API needs a merchant business account with API access
 * enabled — until that's granted, this static payment link (from the Wave
 * Business mobile app's "Send Payment Link") is the real, working fallback.
 * It has no reference field or return redirect, so a paid upgrade is
 * confirmed manually (see api/request-pro-upgrade.ts) rather than
 * automatically like a real Checkout session would be.
 */
export const WAVE_PRO_PAYMENT_LINK = `https://pay.wave.com/m/M_sn_yfwhqTcuOc61/c/sn/?amount=${PLANS.pro.priceXof}`
