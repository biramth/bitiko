import { PLANS } from '@/config/plans'
import type { PlatformShop } from '@/services/platform.service'
import { whatsappUrl } from '@/features/booking/bookingHelpers'

const DAY_MS = 24 * 60 * 60 * 1000

export type PlanFilter = 'all' | 'free' | 'essential' | 'pro' | 'expiring' | 'expired' | 'suspended'
export type ActivityFilter = 'all' | 'active' | 'inactive' | 'never'
export type ShopSort = 'recent' | 'name' | 'revenue' | 'orders' | 'last_order'

export interface ShopFilters {
  query: string
  plan: PlanFilter
  country: string
  activity: ActivityFilter
}

export const DEFAULT_SHOP_FILTERS: ShopFilters = { query: '', plan: 'all', country: 'all', activity: 'all' }

const norm = (value: string | null | undefined) =>
  (value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Jours avant la fin de la période payante (négatif si échue), null sans abonnement payant. */
export function daysLeft(shop: Pick<PlatformShop, 'subscribed_plan' | 'period_end'>, now: number = Date.now()): number | null {
  if (!shop.period_end || shop.subscribed_plan === 'free') return null
  return Math.ceil((new Date(shop.period_end).getTime() - now) / DAY_MS)
}

export function isExpiringSoon(shop: PlatformShop, now: number = Date.now(), withinDays = 7): boolean {
  const left = daysLeft(shop, now)
  return shop.plan !== 'free' && left !== null && left >= 0 && left <= withinDays
}

/** Abonnement payant échu depuis moins de `withinDays` jours : le commerçant a peut-être juste oublié de renouveler. */
export function isRecentlyExpired(shop: PlatformShop, now: number = Date.now(), withinDays = 30): boolean {
  const left = daysLeft(shop, now)
  return shop.plan === 'free' && left !== null && left < 0 && left >= -withinDays
}

/** Commande dans les 30 derniers jours. */
export function isActiveShop(shop: PlatformShop, now: number = Date.now()): boolean {
  return !!shop.last_order_at && now - new Date(shop.last_order_at).getTime() <= 30 * DAY_MS
}

export function filterShops(shops: PlatformShop[], filters: ShopFilters, now: number = Date.now()): PlatformShop[] {
  const q = norm(filters.query.trim())
  return shops.filter((shop) => {
    if (q && ![shop.name, shop.slug, shop.owner_email, shop.whatsapp_number].some((field) => norm(field).includes(q))) return false
    if (filters.country !== 'all' && shop.country_code !== filters.country) return false
    switch (filters.plan) {
      case 'free':
      case 'essential':
      case 'pro':
        if (shop.plan !== filters.plan) return false
        break
      case 'expiring':
        if (!isExpiringSoon(shop, now)) return false
        break
      case 'expired':
        if (!isRecentlyExpired(shop, now)) return false
        break
      case 'suspended':
        if (!shop.suspended_at) return false
        break
    }
    switch (filters.activity) {
      case 'active':
        if (!isActiveShop(shop, now)) return false
        break
      case 'inactive':
        if (!shop.last_order_at || isActiveShop(shop, now)) return false
        break
      case 'never':
        if (shop.last_order_at) return false
        break
    }
    return true
  })
}

export function sortShops(shops: PlatformShop[], sort: ShopSort): PlatformShop[] {
  const list = [...shops]
  const time = (value: string | null) => (value ? new Date(value).getTime() : 0)
  switch (sort) {
    case 'name':
      return list.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    case 'revenue':
      return list.sort((a, b) => Number(b.revenue) - Number(a.revenue))
    case 'orders':
      return list.sort((a, b) => Number(b.orders) - Number(a.orders))
    case 'last_order':
      return list.sort((a, b) => time(b.last_order_at) - time(a.last_order_at))
    default:
      return list.sort((a, b) => time(b.created_at) - time(a.created_at))
  }
}

export interface SubscriptionSummary {
  /** Revenu mensuel récurrent (XOF) des abonnements payants en cours. */
  mrr: number
  payingShops: number
  byPlan: { free: number; essential: number; pro: number }
  expiringSoon: PlatformShop[]
  recentlyExpired: PlatformShop[]
  /** Part des boutiques inscrites sur un plan payant, en %. */
  paidShare: number
}

export function summarizeSubscriptions(shops: PlatformShop[], now: number = Date.now()): SubscriptionSummary {
  const byPlan = { free: 0, essential: 0, pro: 0 }
  let mrr = 0
  for (const shop of shops) {
    const plan = shop.plan in byPlan ? (shop.plan as keyof typeof byPlan) : 'free'
    byPlan[plan] += 1
    if (plan !== 'free') mrr += PLANS[plan].priceXof
  }
  const paying = byPlan.essential + byPlan.pro
  return {
    mrr,
    payingShops: paying,
    byPlan,
    expiringSoon: shops.filter((s) => isExpiringSoon(s, now)).sort((a, b) => (daysLeft(a, now) ?? 0) - (daysLeft(b, now) ?? 0)),
    recentlyExpired: shops.filter((s) => isRecentlyExpired(s, now)).sort((a, b) => (daysLeft(b, now) ?? 0) - (daysLeft(a, now) ?? 0)),
    paidShare: shops.length === 0 ? 0 : Math.round((paying / shops.length) * 100),
  }
}

/** Lien WhatsApp de relance pour un renouvellement (échéance proche ou dépassée). */
export function renewalWhatsAppUrl(shop: PlatformShop, now: number = Date.now()): string | null {
  if (!shop.whatsapp_number) return null
  const left = daysLeft(shop, now)
  const planLabel = PLANS[shop.subscribed_plan as keyof typeof PLANS]?.label ?? 'payant'
  const when = left === null ? '' : left >= 0 ? `arrive à échéance dans ${left} jour${left > 1 ? 's' : ''}` : 'est arrivé à échéance'
  const message = `Bonjour, c’est l’équipe Bitiko. L’abonnement ${planLabel} de « ${shop.name} » ${when}. Pour le renouveler, rendez-vous dans Paramètres › Facturation. Une question ? Répondez-nous ici.`
  return whatsappUrl(shop.whatsapp_number, message)
}
