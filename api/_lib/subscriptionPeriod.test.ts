import { describe, expect, it } from 'vitest'
import { grantedSubscription, isDowngradePurchase, nextSubscription } from './subscriptionPeriod.js'

const NOW = Date.parse('2026-10-01T00:00:00Z')
const DAY = 24 * 60 * 60 * 1000
const iso = (offsetDays: number) => new Date(NOW + offsetDays * DAY).toISOString()

describe('nextSubscription', () => {
  it('démarre à maintenant sans abonnement', () => {
    expect(nextSubscription({ current: null, paidPlan: 'pro', now: NOW })).toEqual({ plan: 'pro', periodEnd: iso(30) })
  })

  it('ajoute 30 jours à la fin en cours pour le même plan', () => {
    const current = { plan: 'pro', current_period_end: iso(3) }
    expect(nextSubscription({ current, paidPlan: 'pro', now: NOW })).toEqual({ plan: 'pro', periodEnd: iso(33) })
  })

  it('repart de maintenant si l’abonnement est expiré', () => {
    const current = { plan: 'pro', current_period_end: iso(-2) }
    expect(nextSubscription({ current, paidPlan: 'pro', now: NOW })).toEqual({ plan: 'pro', periodEnd: iso(30) })
  })

  it('upgrade : nouveau plan, 30 jours depuis maintenant', () => {
    const current = { plan: 'essential', current_period_end: iso(10) }
    expect(nextSubscription({ current, paidPlan: 'pro', now: NOW })).toEqual({ plan: 'pro', periodEnd: iso(30) })
  })

  it('plan inférieur déjà payé : garde le plan supérieur et prolonge', () => {
    const current = { plan: 'pro', current_period_end: iso(5) }
    expect(nextSubscription({ current, paidPlan: 'essential', now: NOW })).toEqual({ plan: 'pro', periodEnd: iso(35) })
  })
})

describe('isDowngradePurchase', () => {
  it('détecte l’achat d’un plan inférieur à un plan actif', () => {
    expect(isDowngradePurchase({ plan: 'pro', current_period_end: iso(5) }, 'essential', NOW)).toBe(true)
  })
  it('autorise renouvellement, upgrade et achat après expiration', () => {
    expect(isDowngradePurchase({ plan: 'pro', current_period_end: iso(5) }, 'pro', NOW)).toBe(false)
    expect(isDowngradePurchase({ plan: 'essential', current_period_end: iso(5) }, 'pro', NOW)).toBe(false)
    expect(isDowngradePurchase({ plan: 'pro', current_period_end: iso(-1) }, 'essential', NOW)).toBe(false)
    expect(isDowngradePurchase(null, 'essential', NOW)).toBe(false)
  })
})

describe('grantedSubscription', () => {
  const NOW = new Date('2026-09-26T12:00:00Z').getTime()
  const day = (n: number) => new Date(NOW + n * 86400000).toISOString()

  it('court à partir de maintenant sans abonnement en cours', () => {
    expect(grantedSubscription({ current: null, plan: 'pro', days: 14, now: NOW })).toEqual({ ok: true, plan: 'pro', periodEnd: day(14) })
    expect(grantedSubscription({ current: { plan: 'pro', current_period_end: day(-3) }, plan: 'pro', days: 7, now: NOW })).toEqual({ ok: true, plan: 'pro', periodEnd: day(7) })
  })

  it('ajoute les jours à la fin en cours pour le même plan', () => {
    expect(grantedSubscription({ current: { plan: 'essential', current_period_end: day(10) }, plan: 'essential', days: 30, now: NOW })).toEqual({ ok: true, plan: 'essential', periodEnd: day(40) })
  })

  it('un upgrade offert démarre maintenant, jamais de rétrogradation d’un plan supérieur actif', () => {
    expect(grantedSubscription({ current: { plan: 'essential', current_period_end: day(10) }, plan: 'pro', days: 30, now: NOW })).toEqual({ ok: true, plan: 'pro', periodEnd: day(30) })
    expect(grantedSubscription({ current: { plan: 'pro', current_period_end: day(10) }, plan: 'essential', days: 30, now: NOW })).toEqual({ ok: false, reason: 'higher_plan_running' })
  })
})
