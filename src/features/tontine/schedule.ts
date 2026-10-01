export type Frequency = 'daily' | 'weekly' | 'monthly'

export const FREQUENCIES: { code: Frequency; label: string; every: string }[] = [
  { code: 'daily', label: 'Chaque jour', every: 'par jour' },
  { code: 'weekly', label: 'Chaque semaine', every: 'par semaine' },
  { code: 'monthly', label: 'Chaque mois', every: 'par mois' },
]

export function frequencyEvery(code: Frequency): string {
  return FREQUENCIES.find((f) => f.code === code)?.every ?? ''
}

export interface TontineSchedule {
  installment_amount: number
  frequency: Frequency
  start_date: string
  end_date: string
}

export interface MemberPlan {
  target_amount: number
  installment_amount: number | null
  joined_on: string
  status: 'active' | 'settled'
}

export type MemberState = 'settled' | 'complete' | 'late' | 'on_track'

export interface MemberProgress {
  saved: number
  target: number
  remaining: number
  /** Ce qui aurait dû être versé à ce jour selon le rythme (plafonné à l'objectif). */
  expected: number
  /** Retard en montant (0 si à jour). */
  behind: number
  percent: number
  installment: number
  state: MemberState
}

const DAY_MS = 86_400_000

function toUtc(iso: string): number {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}

/** Nombre d'échéances entre deux dates incluses, la première tombant le jour de départ.
 *  Mensuel : même quantième chaque mois (le 31 devient le dernier jour des mois courts). */
export function installmentsBetween(from: string, to: string, frequency: Frequency): number {
  const start = toUtc(from)
  const end = toUtc(to)
  if (end < start) return 0
  const days = Math.round((end - start) / DAY_MS)
  if (frequency === 'daily') return days + 1
  if (frequency === 'weekly') return Math.floor(days / 7) + 1

  const s = new Date(start)
  const e = new Date(end)
  let months = (e.getUTCFullYear() - s.getUTCFullYear()) * 12 + (e.getUTCMonth() - s.getUTCMonth())
  const dueDay = Math.min(s.getUTCDate(), daysInMonth(e.getUTCFullYear(), e.getUTCMonth()))
  if (e.getUTCDate() < dueDay) months -= 1
  return months + 1
}

/** Début effectif des versements d'un membre : son inscription, jamais avant l'ouverture de la tontine. */
export function memberStart(tontine: TontineSchedule, joinedOn: string): string {
  return joinedOn > tontine.start_date ? joinedOn : tontine.start_date
}

/** Objectif proposé à l'inscription : versement × nombre d'échéances restantes jusqu'à la remise. */
export function suggestedTarget(tontine: TontineSchedule, joinedOn: string, installment = tontine.installment_amount): number {
  return installment * Math.max(1, installmentsBetween(memberStart(tontine, joinedOn), tontine.end_date, tontine.frequency))
}

export function memberProgress(tontine: TontineSchedule, member: MemberPlan, saved: number, today: string): MemberProgress {
  const installment = member.installment_amount ?? tontine.installment_amount
  const target = member.target_amount
  const lastCounted = today < tontine.end_date ? today : tontine.end_date
  const due = installmentsBetween(memberStart(tontine, member.joined_on), lastCounted, tontine.frequency)
  const expected = Math.min(target, due * installment)
  const remaining = Math.max(0, target - saved)
  const behind = Math.max(0, expected - saved)
  const percent = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0

  let state: MemberState
  if (member.status === 'settled') state = 'settled'
  else if (saved >= target) state = 'complete'
  else if (behind > 0) state = 'late'
  else state = 'on_track'

  return { saved, target, remaining, expected, behind, percent, installment, state }
}

export const STATE_LABELS: Record<MemberState, string> = {
  settled: 'Remis',
  complete: 'Objectif atteint',
  late: 'En retard',
  on_track: 'À jour',
}

/** Jours restants avant la remise (0 le jour même, négatif une fois passée). */
export function daysUntil(date: string, today: string): number {
  return Math.round((toUtc(date) - toUtc(today)) / DAY_MS)
}
