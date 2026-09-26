import { localDateIso } from '@/utils/format'

export type PeriodPreset = 'this_month' | 'last_month' | 'quarter' | 'year'

export interface Period {
  preset: PeriodPreset
  from: string
  /** Inclus (YYYY-MM-DD). */
  to: string
  label: string
  /** Nombre de mois touchés (sert à la limite d'historique des plans). */
  monthSpan: number
}

export const PRESET_LABELS: Record<PeriodPreset, string> = {
  this_month: 'Ce mois-ci',
  last_month: 'Mois dernier',
  quarter: 'Ce trimestre',
  year: 'Cette année',
}

const iso = (year: number, monthIndex: number, day: number) => localDateIso(new Date(year, monthIndex, day))

function monthName(year: number, monthIndex: number, withYear = true): string {
  const name = new Date(year, monthIndex, 1).toLocaleDateString('fr-FR', { month: 'long', ...(withYear ? { year: 'numeric' } : {}) })
  return name.charAt(0).toUpperCase() + name.slice(1)
}

/** Période correspondant à un préréglage, à partir d'une date de référence. */
export function resolvePeriod(preset: PeriodPreset, now: Date = new Date()): Period {
  const year = now.getFullYear()
  const month = now.getMonth()

  switch (preset) {
    case 'this_month':
      return { preset, from: iso(year, month, 1), to: iso(year, month + 1, 0), label: monthName(year, month), monthSpan: 1 }
    case 'last_month': {
      const first = new Date(year, month - 1, 1)
      return {
        preset,
        from: iso(first.getFullYear(), first.getMonth(), 1),
        to: iso(first.getFullYear(), first.getMonth() + 1, 0),
        label: monthName(first.getFullYear(), first.getMonth()),
        monthSpan: 1,
      }
    }
    case 'quarter': {
      const startMonth = Math.floor(month / 3) * 3
      return {
        preset,
        from: iso(year, startMonth, 1),
        to: iso(year, startMonth + 3, 0),
        label: `${monthName(year, startMonth, false)} – ${monthName(year, startMonth + 2)}`,
        monthSpan: 3,
      }
    }
    case 'year':
      return { preset, from: iso(year, 0, 1), to: iso(year, 12, 0), label: String(year), monthSpan: 12 }
  }
}

/** Période de même durée juste avant celle-ci (pour comparer). */
export function previousPeriod(period: Period): Period {
  const [year, month] = period.from.split('-').map(Number)
  const span = period.monthSpan
  const first = new Date(year, month - 1 - span, 1)
  const last = new Date(first.getFullYear(), first.getMonth() + span, 0)
  return {
    preset: period.preset,
    from: localDateIso(first),
    to: localDateIso(last),
    label: `${monthName(first.getFullYear(), first.getMonth(), span === 1)}${span > 1 ? ` – ${monthName(last.getFullYear(), last.getMonth())}` : ''}`,
    monthSpan: span,
  }
}

/** Une période est-elle consultable avec ce plan ? `historyMonths` = mois d'historique
 *  autorisés à partir d'aujourd'hui (le mois en cours compte pour 1) ; `null` = illimité. */
export function isPeriodAllowed(period: Period, historyMonths: number | null, now: Date = new Date()): boolean {
  if (historyMonths === null) return true
  const [year, month] = period.from.split('-').map(Number)
  const monthsBack = (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month)
  return monthsBack < historyMonths && period.monthSpan <= historyMonths
}

/** Liste des mois (YYYY-MM-01) couverts par une période. */
export function monthsInPeriod(period: Period): string[] {
  const [year, month] = period.from.split('-').map(Number)
  return Array.from({ length: period.monthSpan }, (_, i) => iso(year, month - 1 + i, 1))
}

/** « Septembre 2026 » à partir d'un mois YYYY-MM-01. */
export function monthLabel(monthIso: string): string {
  const [year, month] = monthIso.split('-').map(Number)
  return monthName(year, month - 1)
}
