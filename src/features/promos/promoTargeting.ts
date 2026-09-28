import type { ShopPromo } from '@/types/cms'

type Dated = Pick<ShopPromo, 'is_active' | 'starts_at' | 'ends_at'>

/** Une promo est affichable quand elle est active ET dans sa fenêtre de
 *  dates (bornes absentes = sans limite). Pure — unit-testée. */
export function isPromoLive(promo: Dated, now: Date = new Date()): boolean {
  if (!promo.is_active) return false
  const time = now.getTime()
  if (promo.starts_at && new Date(promo.starts_at).getTime() > time) return false
  if (promo.ends_at && new Date(promo.ends_at).getTime() <= time) return false
  return true
}

export function livePromos(promos: ShopPromo[], now: Date = new Date()): ShopPromo[] {
  return promos.filter((p) => isPromoLive(p, now))
}

/** Pastille à afficher sur une carte produit : ciblage direct d'abord, puis
 *  catégorie. Sans `badge_label`, la promo ne pastille pas (elle peut quand
 *  même alimenter un bloc Promo). Pure — unit-testée. */
export function badgeForProduct(
  promos: ShopPromo[],
  product: { id: string; category: { id: string } | null },
  now: Date = new Date(),
): string | null {
  const live = livePromos(promos, now)
  const direct = live.find((p) => p.scope === 'product' && p.product_id === product.id && p.badge_label?.trim())
  if (direct?.badge_label) return direct.badge_label
  const categoryId = product.category?.id
  if (categoryId) {
    const scoped = live.find((p) => p.scope === 'category' && p.category_id === categoryId && p.badge_label?.trim())
    if (scoped?.badge_label) return scoped.badge_label
  }
  return null
}

/** Même règle côté prestations (pastille + catégorie partagée). */
export function badgeForService(
  promos: ShopPromo[],
  service: { id: string; categoryId?: string },
  now: Date = new Date(),
): string | null {
  const live = livePromos(promos, now)
  const direct = live.find((p) => p.scope === 'service' && p.service_id === service.id && p.badge_label?.trim())
  if (direct?.badge_label) return direct.badge_label
  if (service.categoryId) {
    const scoped = live.find((p) => p.scope === 'category' && p.category_id === service.categoryId && p.badge_label?.trim())
    if (scoped?.badge_label) return scoped.badge_label
  }
  return null
}

/** Promos « tout le site » affichables, dans l'ordre du commerçant. */
export function sitePromos(promos: ShopPromo[], now: Date = new Date()): ShopPromo[] {
  return livePromos(promos, now).filter((p) => p.scope === 'site')
}

export function promoById(promos: ShopPromo[], id: string | null | undefined): ShopPromo | null {
  if (!id) return null
  return promos.find((p) => p.id === id) ?? null
}
