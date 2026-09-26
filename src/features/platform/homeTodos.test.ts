import { describe, expect, it } from 'vitest'
import type { PlatformHealth, PlatformShop } from '@/services/platform.service'
import { summarizeSubscriptions } from './shopsInsights'
import { buildHomeTodos } from './homeTodos'

const NOW = new Date('2026-09-26T12:00:00Z').getTime()
const day = (n: number) => new Date(NOW + n * 86400000).toISOString()
const shop = (over: Partial<PlatformShop>): PlatformShop => ({
  id: 'x', name: 'B', slug: 'b', whatsapp_number: null, currency: 'XOF', created_at: day(-100), products: 2, orders: 0, revenue: 0, plan: 'free',
  plan_status: 'none', owner_id: 'o', owner_email: null, country_code: 'SN', business_type: null, subscribed_plan: 'free', period_end: null,
  last_order_at: null, suspended_at: null, ...over,
})
const healthy: PlatformHealth = {
  generated_at: day(0), pending_events: 0, stuck_events: 0, oldest_pending_event: null, failed_runs_7d: 0, skipped_runs_7d: {},
  recent_failures: [], campaign_failures: [], stale_payments: 0, suspended_shops: 0,
}

describe('buildHomeTodos', () => {
  it('ne produit que les sources accessibles au rôle', () => {
    expect(buildHomeTodos({ now: NOW })).toEqual([])
    expect(buildHomeTodos({ pendingPayments: 0, now: NOW }).map((t) => t.key)).toEqual(['payments'])
  })

  it('place le plus urgent en premier et garde « ok » à la fin', () => {
    const shops = [shop({ id: 'a', plan: 'pro', subscribed_plan: 'pro', period_end: day(3) }), shop({ id: 'n', created_at: day(-2), products: 0 })]
    const todos = buildHomeTodos({
      pendingPayments: 4,
      health: { ...healthy, stuck_events: 2, oldest_pending_event: day(-1) },
      subscriptions: summarizeSubscriptions(shops, NOW),
      shops,
      now: NOW,
    })
    expect(todos.map((t) => t.level)).toEqual(['critical', 'critical', 'warning', 'ok'])
    expect(todos[0]).toMatchObject({ key: 'payments', count: 4 })
    expect(todos.at(-1)).toMatchObject({ key: 'new', count: 1 })
    expect(todos.at(-1)?.detail).toContain('sans produit')
  })

  it('signale « rien à signaler » quand tout va bien', () => {
    const todos = buildHomeTodos({ pendingPayments: 0, health: healthy, subscriptions: summarizeSubscriptions([], NOW), shops: [], now: NOW })
    expect(todos.filter((t) => t.key !== 'new').every((t) => t.level === 'ok' && t.count === 0)).toBe(true)
  })

  it('affiche les boutiques suspendues', () => {
    const todos = buildHomeTodos({ shops: [shop({ suspended_at: day(-1) })], now: NOW })
    expect(todos.find((t) => t.key === 'suspended')).toMatchObject({ count: 1, level: 'warning' })
  })
})
