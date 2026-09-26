import { describe, expect, it } from 'vitest'
import { AUDIT_ACTION_LABELS, auditSummary } from './auditLabels'

describe('auditSummary', () => {
  it('résume une offre d’abonnement avec plan, durée et motif', () => {
    expect(auditSummary({ action: 'subscription_grant', details: { plan: 'pro', days: 30, reason: 'Geste commercial' } })).toBe('pro · 30 j · Geste commercial')
  })

  it('tolère des détails vides ou inattendus', () => {
    expect(auditSummary({ action: 'support_access', details: {} })).toBe('')
    expect(auditSummary({ action: 'payment_reject', details: { reason: 'Montant incorrect', other: 12 } })).toBe('Montant incorrect')
  })

  it('libelle chaque action connue par l’API', () => {
    for (const action of ['support_access', 'user_delete', 'team_add', 'biztype_save', 'payment_approve', 'payment_reject', 'promo_save', 'template_save', 'subscription_grant', 'shop_suspend', 'shop_unsuspend']) {
      expect(AUDIT_ACTION_LABELS[action], action).toBeTruthy()
    }
  })
})
