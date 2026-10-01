import { describe, expect, it } from 'vitest'
import { receiptMessage, reminderMessage } from './messages'
import { daysUntil, installmentsBetween, memberProgress, suggestedTarget, type MemberPlan, type TontineSchedule } from './schedule'
import { buildContributionsCsv, buildMembersCsv } from './tontineCsv'
import type { Tontine, TontineContribution, TontineMember } from './types'

const tontine: TontineSchedule = { installment_amount: 5000, frequency: 'weekly', start_date: '2026-10-01', end_date: '2026-12-31' }
const member = (overrides: Partial<MemberPlan> = {}): MemberPlan => ({
  target_amount: 70000,
  installment_amount: null,
  joined_on: '2026-10-01',
  status: 'active',
  ...overrides,
})
const nbsp = (s: string) => s.replace(/[  ]/g, ' ')

describe('installmentsBetween', () => {
  it('compte la première échéance le jour même', () => {
    expect(installmentsBetween('2026-10-01', '2026-10-01', 'weekly')).toBe(1)
    expect(installmentsBetween('2026-10-01', '2026-10-07', 'weekly')).toBe(1)
    expect(installmentsBetween('2026-10-01', '2026-10-08', 'weekly')).toBe(2)
    expect(installmentsBetween('2026-10-01', '2026-10-03', 'daily')).toBe(3)
  })

  it('renvoie 0 avant le début', () => {
    expect(installmentsBetween('2026-10-10', '2026-10-01', 'weekly')).toBe(0)
  })

  it('suit le quantième en mensuel, y compris les fins de mois courtes', () => {
    expect(installmentsBetween('2026-10-15', '2026-11-14', 'monthly')).toBe(1)
    expect(installmentsBetween('2026-10-15', '2026-11-15', 'monthly')).toBe(2)
    expect(installmentsBetween('2027-01-31', '2027-02-28', 'monthly')).toBe(2)
    expect(installmentsBetween('2027-01-31', '2027-02-27', 'monthly')).toBe(1)
  })
})

describe('memberProgress', () => {
  it('signale le retard selon le rythme', () => {
    const progress = memberProgress(tontine, member(), 5000, '2026-10-15')
    expect(progress).toMatchObject({ expected: 15000, behind: 10000, remaining: 65000, state: 'late', percent: 7 })
  })

  it('est à jour quand les versements suivent', () => {
    expect(memberProgress(tontine, member(), 15000, '2026-10-15').state).toBe('on_track')
  })

  it('ne réclame rien avant l’inscription d’un membre arrivé en cours de route', () => {
    const progress = memberProgress(tontine, member({ joined_on: '2026-11-01' }), 0, '2026-10-20')
    expect(progress.expected).toBe(0)
    expect(progress.state).toBe('on_track')
  })

  it('plafonne l’attendu à l’objectif et s’arrête à la date de remise', () => {
    const progress = memberProgress(tontine, member({ target_amount: 20000 }), 0, '2027-03-01')
    expect(progress.expected).toBe(20000)
  })

  it('utilise le versement propre au membre', () => {
    expect(memberProgress(tontine, member({ installment_amount: 10000 }), 0, '2026-10-08').expected).toBe(20000)
  })

  it('distingue objectif atteint et remise faite', () => {
    expect(memberProgress(tontine, member(), 70000, '2026-11-01').state).toBe('complete')
    expect(memberProgress(tontine, member({ status: 'settled' }), 10000, '2026-11-01').state).toBe('settled')
  })
})

describe('suggestedTarget', () => {
  it('multiplie le versement par les échéances restantes', () => {
    expect(suggestedTarget(tontine, '2026-10-01')).toBe(5000 * 14)
    expect(suggestedTarget(tontine, '2026-12-25')).toBe(5000)
    expect(suggestedTarget(tontine, '2027-01-10')).toBe(5000)
  })
})

describe('daysUntil', () => {
  it('compte les jours jusqu’à la remise', () => {
    expect(daysUntil('2026-10-10', '2026-10-01')).toBe(9)
    expect(daysUntil('2026-10-01', '2026-10-02')).toBe(-1)
  })
})

describe('messages WhatsApp', () => {
  const ctx = { shopName: 'Chez Awa', tontineName: 'Tabaski 2027', memberName: 'Moussa', currency: 'XOF', saved: 45000, target: 150000 }

  it('rédige le reçu', () => {
    const text = nbsp(receiptMessage({ ...ctx, amount: 5000, paidOn: '2026-10-08' }))
    expect(text).toContain('versement de 5 000 F CFA le 08/10/2026 pour « Tabaski 2027 »')
    expect(text).toContain('Total épargné : 45 000 F CFA sur 150 000 F CFA')
  })

  it('rédige le rappel', () => {
    const text = nbsp(reminderMessage({ ...ctx, behind: 10000, endDate: '2027-05-20' }))
    expect(text).toContain('il manque 10 000 F CFA')
    expect(text).toContain('remise prévue le 20/05/2027')
  })
})

describe('exports CSV', () => {
  const full: Tontine = { ...tontine, id: 't1', name: 'Tabaski', goal_label: null, status: 'active', note: null, created_at: '' }
  const m: TontineMember = {
    id: 'm1', tontine_id: 't1', name: '=Awa', phone: '+221771234567', target_amount: 70000, target_label: 'Mouton',
    installment_amount: null, note: null, joined_on: '2026-10-01', status: 'active', settlement_kind: null,
    settled_amount: null, settled_on: null, settlement_note: null,
  }

  it('produit le carnet des membres, protégé contre les formules', () => {
    const csv = buildMembersCsv(full, [{ member: m, progress: memberProgress(full, m, 5000, '2026-10-15') }])
    const line = csv.split('\r\n').find((l) => l.includes('Awa'))
    expect(line).toBe("'=Awa;00221 77 123 45 67;Mouton;70000;5000;65000;10000;En retard;;")
  })

  it('garde les versements annulés avec leur motif', () => {
    const c: TontineContribution = {
      id: 'c1', member_id: 'm1', amount: 5000, paid_on: '2026-10-08', payment_method: 'cash', note: null,
      created_at: '', cancelled_at: '2026-10-09T10:00:00Z', cancel_reason: 'Doublon',
    }
    const csv = buildContributionsCsv([c], new Map([['m1', 'Awa']]))
    expect(csv.split('\r\n')[1]).toBe('08/10/2026;Awa;5000;Espèces;;Oui;Doublon')
  })
})
