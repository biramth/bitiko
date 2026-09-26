import { localDateIso } from '@/utils/format'

/** Décale une date YYYY-MM-DD de `days` jours (calcul en heure locale). */
export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  return localDateIso(date)
}

/** « lundi 28 septembre » (l'année n'apparaît que si elle n'est pas l'année en cours). */
export function formatLongDate(iso: string, now: Date = new Date()): string {
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(year !== now.getFullYear() ? { year: 'numeric' } : {}),
  })
}

/** Libellé relatif d'un jour : « Aujourd'hui », « Demain », « Hier » ou null. */
export function relativeDayLabel(iso: string, today: string = localDateIso()): string | null {
  if (iso === today) return 'Aujourd’hui'
  if (iso === addDays(today, 1)) return 'Demain'
  if (iso === addDays(today, -1)) return 'Hier'
  return null
}

export function formatClock(iso: string, timeZone?: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone })
}

/** « 10:30 – 11:15 » */
export function formatTimeRange(startIso: string, endIso: string, timeZone?: string): string {
  return `${formatClock(startIso, timeZone)} – ${formatClock(endIso, timeZone)}`
}

/** Chiffres seuls d'un numéro, sans « + » (format attendu par wa.me). */
export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, '')
}

export function telUrl(phone: string): string {
  return `tel:+${phoneDigits(phone)}`
}

/** Lien WhatsApp avec message pré-rempli pour prévenir le client. */
export function whatsappUrl(phone: string, message: string): string {
  return `https://wa.me/${phoneDigits(phone)}?text=${encodeURIComponent(message)}`
}

/** Compte les éléments par statut, plus un total « all ». */
export function countByStatus<T extends { status: string }>(items: T[]): Record<string, number> {
  const counts: Record<string, number> = { all: items.length }
  for (const item of items) counts[item.status] = (counts[item.status] ?? 0) + 1
  return counts
}

/** Lundi de la semaine contenant `iso` (semaine ISO : lundi → dimanche). */
export function startOfWeek(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const offset = (date.getDay() + 6) % 7
  return addDays(iso, -offset)
}

export interface DayCount {
  total: number
  pending: number
}

/** Regroupe des créneaux par jour local (hors annulés) : total et à confirmer. */
export function groupByLocalDay(items: { start_at: string; status: string }[]): Record<string, DayCount> {
  const result: Record<string, DayCount> = {}
  for (const item of items) {
    if (item.status === 'cancelled') continue
    const day = localDateIso(new Date(item.start_at))
    const entry = (result[day] ??= { total: 0, pending: 0 })
    entry.total += 1
    if (item.status === 'pending') entry.pending += 1
  }
  return result
}
