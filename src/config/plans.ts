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
  advancedBuilder: boolean
  removableBranding: boolean
  analytics: 'basic' | 'standard' | 'advanced'
  maxCustomPages: number | null
  /**
   * Cap on freely-addable content blocks (Bannière/Hero, Texte, Image,
   * Promotion, FAQ, Lookbook…) per page — not the catalog-display blocks
   * (Catégories, Produits) or the commerce singletons, which every plan can
   * always use in full. Complements `maxCustomPages` (how many pages) and
   * `advancedBuilder` (whether Styles/templates are browsable at all) as a
   * third, Shopify-style lever on "profondeur de personnalisation" — every
   * template stays available to every plan (see StoreBuilderLock,
   * TemplateLibraryPanel); plans differ on how much a merchant can build on
   * top of one. `null` = unlimited.
   */
  maxCustomSections: number | null
}

export const PLANS: Record<PlanKey, Plan> = {
  free: {
    key: 'free',
    label: 'Découverte',
    priceXof: 0,
    maxActiveProducts: 8,
    storeBuilderAccess: true,
    advancedBuilder: false,
    removableBranding: false,
    analytics: 'basic',
    maxCustomPages: 1,
    maxCustomSections: 3,
  },
  essential: {
    key: 'essential',
    label: 'Essentiel',
    priceXof: 3_000,
    maxActiveProducts: 50,
    storeBuilderAccess: true,
    advancedBuilder: true,
    removableBranding: false,
    analytics: 'standard',
    maxCustomPages: 5,
    maxCustomSections: 10,
  },
  pro: {
    key: 'pro',
    label: 'Pro',
    priceXof: 10_000,
    maxActiveProducts: null,
    storeBuilderAccess: true,
    advancedBuilder: true,
    removableBranding: true,
    analytics: 'advanced',
    maxCustomPages: null,
    maxCustomSections: null,
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
  return new Date(subscription.current_period_end).getTime() > Date.now() ? subscription.plan : 'free'
}

export function effectivePlan(subscription: ShopSubscription | null | undefined): Plan {
  return PLANS[effectivePlanKey(subscription)]
}

export function canAddProduct(plan: Plan, currentActiveCount: number): boolean {
  return plan.maxActiveProducts === null || currentActiveCount < plan.maxActiveProducts
}

/** Whether the plan allows one more freely-addable content block, given how
 *  many the page being edited already has (see `Plan.maxCustomSections`). */
export function canAddSection(plan: Plan, currentCustomSectionCount: number): boolean {
  return plan.maxCustomSections === null || currentCustomSectionCount < plan.maxCustomSections
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

export const WAVE_ESSENTIAL_PAYMENT_LINK = `https://pay.wave.com/m/M_sn_yfwhqTcuOc61/c/sn/?amount=${PLANS.essential.priceXof}`
