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
  /**
   * Cap on photos per product (product gallery photos + one photo per
   * variant combined). Free plan = 4 (1 main photo + up to 3 gallery
   * photos, or up to 2 variant photos within the same budget); paid plans
   * are unlimited. `null` = unlimited.
   */
  maxProductImages: number | null
  /**
   * Cap on product variants. Free plan = 2 (each variant can hold one
   * photo, so up to 4 total photos with the main one). `null` = unlimited.
   */
  maxVariants: number | null
}

export const PLANS: Record<PlanKey, Plan> = {
  free: {
    key: 'free',
    label: 'Découverte',
    priceXof: 0,
    maxActiveProducts: 15,
    storeBuilderAccess: true,
    advancedBuilder: false,
    removableBranding: false,
    analytics: 'basic',
    maxCustomPages: 1,
    maxCustomSections: 3,
    maxProductImages: 4,
    maxVariants: 2,
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
    maxProductImages: null,
    maxVariants: null,
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
    maxProductImages: null,
    maxVariants: null,
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
 * Whether the plan allows one more photo on a product. The image budget is
 * shared between gallery photos and variant photos: on the free plan a
 * product holds 4 photos total, so a new gallery photo is blocked once
 * productPhotos + variantPhotos >= the budget.
 */
export function canAddProductImage(
  plan: Plan,
  productPhotos: number,
  variantPhotos: number,
): boolean {
  return plan.maxProductImages === null || productPhotos + variantPhotos < plan.maxProductImages
}

/** Whether the plan allows one more product variant (see `Plan.maxVariants`). */
export function canAddVariant(plan: Plan, currentVariantCount: number): boolean {
  return plan.maxVariants === null || currentVariantCount < plan.maxVariants
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
