import { describe, expect, it } from 'vitest'
import type { PlatformShop } from '@/services/platform.service'
import { DEFAULT_SHOP_FILTERS, daysLeft, filterShops, renewalWhatsAppUrl, sortShops, summarizeSubscriptions } from './shopsInsights'

const NOW = new Date('2026-09-26T12:00:00Z').getTime()
const day = (n: number) => new Date(NOW + n * 86400000).toISOString()

const shop = (over: Partial<PlatformShop>): PlatformShop => ({
  id: 'x', name: 'Boutique', slug: 'boutique', whatsapp_number: '+221771234567', currency: 'XOF', created_at: day(-100),
  products: 3, orders: 2, revenue: 50000, plan: 'free', plan_status: 'none', owner_id: 'o', owner_email: 'a@b.sn',
  country_code: 'SN', business_type: 'mode', subscribed_plan: 'free', period_end: null, last_order_at: day(-5), ...over,
})

const shops = [
  shop({ id: 'free', name: 'Café Léa', slug: 'cafe-lea', last_order_at: null, orders: 0, revenue: 0 }),
  shop({ id: 'pro-soon', name: 'Wax Fatou', plan: 'pro', subscribed_plan: 'pro', plan_status: 'active', period_end: day(3), revenue: 900000 }),
  shop({ id: 'ess-ok', name: 'Salon Awa', plan: 'essential', subscribed_plan: 'essential', period_end: day(20), country_code: 'CI', last_order_at: day(-60) }),
  shop({ id: 'lapsed', name: 'Boutique Moussa', plan: 'free', subscribed_plan: 'pro', period_end: day(-10) }),
  shop({ id: 'old-lapsed', name: 'Vieux', plan: 'free', subscribed_plan: 'essential', period_end: day(-90) }),
]
const ids = (list: PlatformShop[]) => list.map((s) => s.id)

describe('daysLeft', () => {
  it('compte les jours restants, négatifs si échu, null sans abonnement payant', () => {
    expect(daysLeft(shops[1], NOW)).toBe(3)
    expect(daysLeft(shops[3], NOW)).toBe(-10)
    expect(daysLeft(shops[0], NOW)).toBeNull()
  })
})

describe('filterShops', () => {
  it('cherche sans accent ni casse dans le nom, le slug, l’email et le WhatsApp', () => {
    expect(ids(filterShops(shops, { ...DEFAULT_SHOP_FILTERS, query: 'cafe lea' }, NOW))).toEqual(['free'])
    expect(ids(filterShops(shops, { ...DEFAULT_SHOP_FILTERS, query: 'café' }, NOW))).toEqual(['free'])
    expect(ids(filterShops(shops, { ...DEFAULT_SHOP_FILTERS, query: 'WAX' }, NOW))).toEqual(['pro-soon'])
    expect(filterShops(shops, { ...DEFAULT_SHOP_FILTERS, query: '771234567' }, NOW)).toHaveLength(5)
  })

  it('filtre par plan effectif, échéance proche et échu récent', () => {
    expect(ids(filterShops(shops, { ...DEFAULT_SHOP_FILTERS, plan: 'pro' }, NOW))).toEqual(['pro-soon'])
    expect(ids(filterShops(shops, { ...DEFAULT_SHOP_FILTERS, plan: 'free' }, NOW))).toEqual(['free', 'lapsed', 'old-lapsed'])
    expect(ids(filterShops(shops, { ...DEFAULT_SHOP_FILTERS, plan: 'expiring' }, NOW))).toEqual(['pro-soon'])
    expect(ids(filterShops(shops, { ...DEFAULT_SHOP_FILTERS, plan: 'expired' }, NOW))).toEqual(['lapsed'])
  })

  it('filtre par pays et par activité', () => {
    expect(ids(filterShops(shops, { ...DEFAULT_SHOP_FILTERS, country: 'CI' }, NOW))).toEqual(['ess-ok'])
    expect(ids(filterShops(shops, { ...DEFAULT_SHOP_FILTERS, activity: 'never' }, NOW))).toEqual(['free'])
    expect(ids(filterShops(shops, { ...DEFAULT_SHOP_FILTERS, activity: 'inactive' }, NOW))).toEqual(['ess-ok'])
    expect(ids(filterShops(shops, { ...DEFAULT_SHOP_FILTERS, activity: 'active' }, NOW))).toEqual(['pro-soon', 'lapsed', 'old-lapsed'])
  })
})

describe('sortShops', () => {
  it('trie par chiffre d’affaires et par dernière commande sans muter la liste', () => {
    const copy = [...shops]
    expect(sortShops(shops, 'revenue')[0].id).toBe('pro-soon')
    expect(sortShops(shops, 'last_order').at(-1)?.id).toBe('free')
    expect(sortShops(shops, 'name')[0].name).toBe('Boutique Moussa')
    expect(shops).toEqual(copy)
  })
})

describe('summarizeSubscriptions', () => {
  it('calcule le MRR des seuls abonnements en cours et repère ceux à relancer', () => {
    const summary = summarizeSubscriptions(shops, NOW)
    expect(summary.mrr).toBe(10_000 + 3_000)
    expect(summary.byPlan).toEqual({ free: 3, essential: 1, pro: 1 })
    expect(summary.payingShops).toBe(2)
    expect(summary.paidShare).toBe(40)
    expect(ids(summary.expiringSoon)).toEqual(['pro-soon'])
    expect(ids(summary.recentlyExpired)).toEqual(['lapsed'])
  })

  it('supporte une plateforme vide', () => {
    expect(summarizeSubscriptions([], NOW)).toMatchObject({ mrr: 0, paidShare: 0, payingShops: 0 })
  })
})

describe('renewalWhatsAppUrl', () => {
  it('prépare un message adapté à l’échéance', () => {
    const soon = decodeURIComponent(renewalWhatsAppUrl(shops[1], NOW)!)
    expect(soon).toContain('wa.me/221771234567')
    expect(soon).toContain('dans 3 jours')
    expect(decodeURIComponent(renewalWhatsAppUrl(shops[3], NOW)!)).toContain('est arrivé à échéance')
  })

  it('ne renvoie rien sans numéro', () => {
    expect(renewalWhatsAppUrl(shop({ whatsapp_number: null }), NOW)).toBeNull()
  })
})
