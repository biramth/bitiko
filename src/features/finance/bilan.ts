import { categoryLabel, type EntryKind } from './categories'
import { monthsInPeriod, type Period } from './periods'

export interface RevenueRow {
  /** Premier jour du mois (YYYY-MM-DD). */
  month: string
  source: 'orders' | 'appointments'
  amount: number
  entries: number
}

export interface FinanceEntry {
  id: string
  kind: EntryKind
  category: string
  label: string
  amount: number
  entry_date: string
  payment_method: string | null
  note: string | null
  created_at: string
}

export interface CategoryTotal {
  category: string
  label: string
  amount: number
  /** Part du total (0–100). */
  share: number
}

export interface MonthTotals {
  month: string
  revenue: number
  expenses: number
  result: number
}

export interface Bilan {
  totals: { revenue: number; expenses: number; result: number; /** Résultat / recettes, en % (null sans recettes). */ margin: number | null }
  revenueBySource: { orders: { amount: number; count: number }; appointments: { amount: number; count: number }; manual: { amount: number; count: number } }
  revenueByCategory: CategoryTotal[]
  expensesByCategory: CategoryTotal[]
  months: MonthTotals[]
  entryCount: number
  /** Rien à afficher : aucune recette automatique ni saisie sur la période. */
  isEmpty: boolean
}

const monthOf = (isoDate: string) => `${isoDate.slice(0, 7)}-01`

function withShares(byCategory: Map<string, number>): CategoryTotal[] {
  const total = [...byCategory.values()].reduce((sum, v) => sum + v, 0)
  return [...byCategory.entries()]
    .map(([category, amount]) => ({
      category,
      label: categoryLabel(category),
      amount,
      share: total > 0 ? Math.round((amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
}

/** Construit le bilan d'une période : recettes automatiques (commandes payées ou
 *  livrées, rendez-vous terminés) + saisies du journal, ventilées par source, par
 *  catégorie et par mois. Fonction pure, indépendante de l'interface. */
export function buildBilan(input: { period: Period; revenueRows: RevenueRow[]; entries: FinanceEntry[] }): Bilan {
  const { period, revenueRows, entries } = input
  const inPeriod = entries.filter((e) => e.entry_date >= period.from && e.entry_date <= period.to)

  const monthMap = new Map<string, MonthTotals>(
    monthsInPeriod(period).map((month) => [month, { month, revenue: 0, expenses: 0, result: 0 }]),
  )
  const bucket = (month: string): MonthTotals => {
    const existing = monthMap.get(month)
    if (existing) return existing
    const created = { month, revenue: 0, expenses: 0, result: 0 }
    monthMap.set(month, created)
    return created
  }

  const revenueBySource = {
    orders: { amount: 0, count: 0 },
    appointments: { amount: 0, count: 0 },
    manual: { amount: 0, count: 0 },
  }
  const revenueCategories = new Map<string, number>()
  const expenseCategories = new Map<string, number>()

  for (const row of revenueRows) {
    revenueBySource[row.source].amount += row.amount
    revenueBySource[row.source].count += row.entries
    bucket(row.month).revenue += row.amount
  }
  if (revenueBySource.orders.amount > 0) revenueCategories.set('commandes_en_ligne', revenueBySource.orders.amount)
  if (revenueBySource.appointments.amount > 0) revenueCategories.set('prestations_terminees', revenueBySource.appointments.amount)

  for (const entry of inPeriod) {
    const month = bucket(monthOf(entry.entry_date))
    if (entry.kind === 'income') {
      revenueBySource.manual.amount += entry.amount
      revenueBySource.manual.count += 1
      month.revenue += entry.amount
      revenueCategories.set(entry.category, (revenueCategories.get(entry.category) ?? 0) + entry.amount)
    } else {
      month.expenses += entry.amount
      expenseCategories.set(entry.category, (expenseCategories.get(entry.category) ?? 0) + entry.amount)
    }
  }

  const months = [...monthMap.values()]
    .map((m) => ({ ...m, result: m.revenue - m.expenses }))
    .sort((a, b) => a.month.localeCompare(b.month))
  const revenue = months.reduce((sum, m) => sum + m.revenue, 0)
  const expenses = months.reduce((sum, m) => sum + m.expenses, 0)
  const result = revenue - expenses

  return {
    totals: { revenue, expenses, result, margin: revenue > 0 ? Math.round((result / revenue) * 100) : null },
    revenueBySource,
    revenueByCategory: withShares(revenueCategories),
    expensesByCategory: withShares(expenseCategories),
    months,
    entryCount: inPeriod.length,
    isEmpty: revenue === 0 && expenses === 0,
  }
}

/** Variation en % entre deux valeurs (null si la base est nulle : pas de pourcentage trompeur). */
export function variation(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / Math.abs(previous)) * 100)
}
