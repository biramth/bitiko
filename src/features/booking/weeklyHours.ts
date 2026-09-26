/** Horaires de réservation par jour. Clés : jour ISO (1 lundi … 7 dimanche) ;
 *  valeur : plages [début, fin] au format HH:MM. Jour absent ou vide = fermé.
 *  Miroir de `booking_day_ranges()` (migration 0129). */
export type TimeRange = [string, string]
export type WeeklyHours = Record<string, TimeRange[]>

export const WEEK_DAYS = [
  { value: 1, short: 'Lun', long: 'Lundi' },
  { value: 2, short: 'Mar', long: 'Mardi' },
  { value: 3, short: 'Mer', long: 'Mercredi' },
  { value: 4, short: 'Jeu', long: 'Jeudi' },
  { value: 5, short: 'Ven', long: 'Vendredi' },
  { value: 6, short: 'Sam', long: 'Samedi' },
  { value: 7, short: 'Dim', long: 'Dimanche' },
] as const

const hhmm = (time: string) => time.slice(0, 5)

/** Lundi → samedi, 9 h – 19 h : les horaires proposés tant que rien n'est réglé. */
export function defaultWeeklyHours(): WeeklyHours {
  const weekly: WeeklyHours = {}
  for (const day of [1, 2, 3, 4, 5, 6]) weekly[String(day)] = [['09:00', '19:00']]
  return weekly
}

/** Horaires effectifs d'une boutique : `weekly_hours` s'il existe, sinon
 *  l'ancien mode (jours ouverts + une plage unique) converti. */
export function weeklyHoursFromSettings(saved: {
  weekly_hours: unknown
  open_days: number[]
  open_time: string
  close_time: string
} | null | undefined): WeeklyHours {
  if (!saved) return defaultWeeklyHours()
  if (saved.weekly_hours && typeof saved.weekly_hours === 'object' && !Array.isArray(saved.weekly_hours)) {
    const result: WeeklyHours = {}
    for (const [day, ranges] of Object.entries(saved.weekly_hours as Record<string, unknown>)) {
      if (!Array.isArray(ranges)) continue
      const clean = ranges
        .filter((r): r is [string, string] => Array.isArray(r) && typeof r[0] === 'string' && typeof r[1] === 'string')
        .map(([start, end]): TimeRange => [hhmm(start), hhmm(end)])
      if (clean.length > 0) result[day] = clean
    }
    return result
  }
  const weekly: WeeklyHours = {}
  for (const day of saved.open_days) weekly[String(day)] = [[hhmm(saved.open_time), hhmm(saved.close_time)]]
  return weekly
}

export function isClosedOn(weekly: WeeklyHours, closedDates: string[], iso: string): boolean {
  if (closedDates.includes(iso)) return true
  const [year, month, day] = iso.split('-').map(Number)
  const dow = new Date(year, month - 1, day).getDay()
  const isoDow = dow === 0 ? 7 : dow
  return (weekly[String(isoDow)] ?? []).length === 0
}

/** Erreur lisible pour un jour (plage vide, inversée ou qui se chevauche), ou null. */
export function validateDayRanges(ranges: TimeRange[]): string | null {
  const sorted = [...ranges].sort((a, b) => a[0].localeCompare(b[0]))
  for (const [start, end] of sorted) {
    if (!start || !end) return 'Renseignez l’heure de début et de fin.'
    if (end <= start) return 'La fin doit être après le début.'
  }
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i][0] < sorted[i - 1][1]) return 'Deux plages se chevauchent.'
  }
  return null
}

export function validateWeek(weekly: WeeklyHours): { ok: boolean; dayErrors: Record<string, string> } {
  const dayErrors: Record<string, string> = {}
  for (const [day, ranges] of Object.entries(weekly)) {
    const error = validateDayRanges(ranges)
    if (error) dayErrors[day] = error
  }
  const anyOpen = Object.values(weekly).some((ranges) => ranges.length > 0)
  return { ok: anyOpen && Object.keys(dayErrors).length === 0, dayErrors }
}

/** Colonnes historiques (jours ouverts, première ouverture, dernière fermeture) dérivées de
 *  `weekly` : gardées cohérentes pour tout ce qui lit encore l'ancien format. */
export function legacyColumns(weekly: WeeklyHours): { open_days: number[]; open_time: string; close_time: string } {
  const openDays = WEEK_DAYS.map((d) => d.value).filter((day) => (weekly[String(day)] ?? []).length > 0)
  const all = openDays.flatMap((day) => weekly[String(day)])
  const open = all.map((r) => r[0]).sort()[0] ?? '09:00'
  const close = all.map((r) => r[1]).sort().at(-1) ?? '19:00'
  return { open_days: openDays, open_time: open, close_time: close }
}

const rangesLabel = (ranges: TimeRange[]) => [...ranges].sort((a, b) => a[0].localeCompare(b[0])).map(([s, e]) => `${s} – ${e}`).join(' et ')

/** « Lun – Ven 09:00 – 12:30 et 14:00 – 19:00 · Sam 09:00 – 13:00 · Dim fermé » : jours consécutifs identiques regroupés. */
export function summarizeWeek(weekly: WeeklyHours): string {
  const groups: { days: number[]; label: string }[] = []
  for (const day of WEEK_DAYS) {
    const ranges = weekly[String(day.value)] ?? []
    const label = ranges.length === 0 ? 'fermé' : rangesLabel(ranges)
    const last = groups[groups.length - 1]
    if (last && last.label === label && last.days[last.days.length - 1] === day.value - 1) last.days.push(day.value)
    else groups.push({ days: [day.value], label })
  }
  const short = (value: number) => WEEK_DAYS[value - 1].short
  return groups
    .map(({ days, label }) => {
      const name = days.length >= 3 ? `${short(days[0])} – ${short(days[days.length - 1])}` : days.map(short).join(', ')
      return `${name} ${label}`
    })
    .join(' · ')
}
