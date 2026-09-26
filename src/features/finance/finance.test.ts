import { describe, expect, it } from 'vitest'
import { buildBilan, variation, type FinanceEntry, type RevenueRow } from './bilan'
import { buildBilanCsv, buildEntriesCsv, exportFilename, frenchDate } from './exportCsv'
import { isPeriodAllowed, monthsInPeriod, previousPeriod, resolvePeriod } from './periods'
import { categoriesFor, categoryLabel } from './categories'

const NOW = new Date(2026, 8, 26) // 26 septembre 2026

const entry = (over: Partial<FinanceEntry>): FinanceEntry => ({
  id: 'e',
  kind: 'expense',
  category: 'stock',
  label: 'Achat',
  amount: 1000,
  entry_date: '2026-09-10',
  payment_method: null,
  note: null,
  created_at: '2026-09-10T10:00:00Z',
  ...over,
})

describe('resolvePeriod', () => {
  it('calcule mois, mois dernier, trimestre et année', () => {
    expect(resolvePeriod('this_month', NOW)).toMatchObject({ from: '2026-09-01', to: '2026-09-30', label: 'Septembre 2026', monthSpan: 1 })
    expect(resolvePeriod('last_month', NOW)).toMatchObject({ from: '2026-08-01', to: '2026-08-31' })
    expect(resolvePeriod('quarter', NOW)).toMatchObject({ from: '2026-07-01', to: '2026-09-30', monthSpan: 3 })
    expect(resolvePeriod('year', NOW)).toMatchObject({ from: '2026-01-01', to: '2026-12-31', monthSpan: 12 })
  })

  it('passe l’année en janvier (mois dernier)', () => {
    expect(resolvePeriod('last_month', new Date(2026, 0, 15))).toMatchObject({ from: '2025-12-01', to: '2025-12-31' })
  })

  it('donne la période précédente de même durée', () => {
    expect(previousPeriod(resolvePeriod('this_month', NOW))).toMatchObject({ from: '2026-08-01', to: '2026-08-31' })
    expect(previousPeriod(resolvePeriod('quarter', NOW))).toMatchObject({ from: '2026-04-01', to: '2026-06-30' })
    expect(previousPeriod(resolvePeriod('year', NOW))).toMatchObject({ from: '2025-01-01', to: '2025-12-31' })
  })

  it('liste les mois couverts', () => {
    expect(monthsInPeriod(resolvePeriod('quarter', NOW))).toEqual(['2026-07-01', '2026-08-01', '2026-09-01'])
  })
})

describe('isPeriodAllowed', () => {
  it('limite l’historique selon le plan', () => {
    expect(isPeriodAllowed(resolvePeriod('this_month', NOW), 1, NOW)).toBe(true)
    expect(isPeriodAllowed(resolvePeriod('last_month', NOW), 1, NOW)).toBe(false)
    expect(isPeriodAllowed(resolvePeriod('quarter', NOW), 1, NOW)).toBe(false)
    expect(isPeriodAllowed(resolvePeriod('year', NOW), 12, NOW)).toBe(true)
    expect(isPeriodAllowed(resolvePeriod('year', NOW), null, NOW)).toBe(true)
  })
})

describe('buildBilan', () => {
  const period = resolvePeriod('quarter', NOW)
  const revenueRows: RevenueRow[] = [
    { month: '2026-07-01', source: 'orders', amount: 100000, entries: 10 },
    { month: '2026-08-01', source: 'orders', amount: 50000, entries: 5 },
    { month: '2026-08-01', source: 'appointments', amount: 30000, entries: 6 },
  ]
  const entries = [
    entry({ id: '1', category: 'stock', amount: 60000, entry_date: '2026-07-05' }),
    entry({ id: '2', category: 'loyer', amount: 40000, entry_date: '2026-08-01' }),
    entry({ id: '3', category: 'stock', amount: 20000, entry_date: '2026-08-20' }),
    entry({ id: '4', kind: 'income', category: 'vente_comptoir', amount: 15000, entry_date: '2026-09-02' }),
    entry({ id: '5', amount: 99999, entry_date: '2026-06-30' }), // hors période
  ]
  const bilan = buildBilan({ period, revenueRows, entries })

  it('additionne recettes automatiques et saisies, et calcule le résultat', () => {
    expect(bilan.totals.revenue).toBe(195000)
    expect(bilan.totals.expenses).toBe(120000)
    expect(bilan.totals.result).toBe(75000)
    expect(bilan.totals.margin).toBe(38)
    expect(bilan.entryCount).toBe(4)
    expect(bilan.isEmpty).toBe(false)
  })

  it('ventile par source et par catégorie (triées, avec parts)', () => {
    expect(bilan.revenueBySource.orders).toEqual({ amount: 150000, count: 15 })
    expect(bilan.revenueBySource.manual).toEqual({ amount: 15000, count: 1 })
    expect(bilan.expensesByCategory.map((c) => [c.category, c.amount, c.share])).toEqual([
      ['stock', 80000, 67],
      ['loyer', 40000, 33],
    ])
  })

  it('donne un résultat par mois, y compris les mois vides', () => {
    expect(bilan.months.map((m) => [m.month, m.revenue, m.expenses, m.result])).toEqual([
      ['2026-07-01', 100000, 60000, 40000],
      ['2026-08-01', 80000, 60000, 20000],
      ['2026-09-01', 15000, 0, 15000],
    ])
  })

  it('reste sûr sans données', () => {
    const empty = buildBilan({ period: resolvePeriod('this_month', NOW), revenueRows: [], entries: [] })
    expect(empty.isEmpty).toBe(true)
    expect(empty.totals.margin).toBeNull()
    expect(empty.months).toHaveLength(1)
  })

  it('signale une perte', () => {
    const loss = buildBilan({ period: resolvePeriod('this_month', NOW), revenueRows: [], entries: [entry({ amount: 5000 })] })
    expect(loss.totals.result).toBe(-5000)
  })
})

describe('variation', () => {
  it('calcule un pourcentage, sans diviser par zéro', () => {
    expect(variation(120, 100)).toBe(20)
    expect(variation(50, 100)).toBe(-50)
    expect(variation(10, 0)).toBeNull()
  })
})

describe('exports CSV', () => {
  it('journal : BOM, séparateur point-virgule, montants signés, dates françaises, citations échappées', () => {
    const csv = buildEntriesCsv([
      entry({ id: 'a', label: 'Achat "tissu"; wax', amount: 25000, entry_date: '2026-09-10', category: 'stock', payment_method: 'cash' }),
      entry({ id: 'b', kind: 'income', category: 'vente_comptoir', label: 'Vente', amount: 8000, entry_date: '2026-09-02' }),
    ])
    expect(csv.startsWith('﻿Date;Type;Catégorie;Libellé;Montant;Mode de paiement;Note')).toBe(true)
    const lines = csv.trim().split('\r\n')
    expect(lines[1]).toBe('02/09/2026;Recette;Ventes en boutique / au comptoir;Vente;8000;;')
    expect(lines[2]).toBe('10/09/2026;Dépense;Achats de marchandises;"Achat ""tissu""; wax";-25000;Espèces;')
  })

  it('neutralise les formules Excel dans les libellés', () => {
    const csv = buildEntriesCsv([entry({ label: '=HYPERLINK("http://x")' }), entry({ label: '-cmd', id: 'z' })])
    expect(csv).toContain(`"'=HYPERLINK(""http://x"")"`)
    expect(csv).toContain(";'-cmd;")
  })

  it('bilan : résumé, détail et mois par mois', () => {
    const bilan = buildBilan({
      period: resolvePeriod('this_month', NOW),
      revenueRows: [{ month: '2026-09-01', source: 'orders', amount: 90000, entries: 9 }],
      entries: [entry({ amount: 30000 })],
    })
    const csv = buildBilanCsv({ shopName: 'Chez Awa', periodLabel: 'Septembre 2026', currency: 'XOF', bilan })
    expect(csv).toContain('Bilan simple;Chez Awa')
    expect(csv).toContain('Recettes;90000')
    expect(csv).toContain('Bénéfice;60000')
    expect(csv).toContain('Marge (%);67')
    expect(csv).toContain('Achats de marchandises;30000;100')
    expect(csv).toContain('2026-09;90000;30000;60000')
  })

  it('nomme les fichiers proprement', () => {
    expect(exportFilename('bilan', 'Salon Awa Beauté !', '2026-09')).toBe('bilan-salon-awa-beaute-2026-09.csv')
    expect(exportFilename('journal', '???', '2026')).toBe('journal-boutique-2026.csv')
    expect(frenchDate('2026-09-05')).toBe('05/09/2026')
  })
})

describe('catégories', () => {
  it('ont des libellés, y compris pour les recettes automatiques', () => {
    expect(categoryLabel('loyer')).toBe('Loyer et charges du local')
    expect(categoryLabel('commandes_en_ligne')).toBe('Ventes en ligne')
    expect(categoryLabel('inconnu')).toBe('Autre')
    expect(categoriesFor('income').every((c) => c.kind === 'income')).toBe(true)
  })
})
