const STORAGE_KEY = 'bitiko-guided-tours'

/** `seen` : lancée (ou proposée puis écartée) ; `done` : suivie jusqu'au bout. */
export type TourStatus = 'new' | 'seen' | 'done'

function read(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

function write(tourId: string, status: Exclude<TourStatus, 'new'>): void {
  try {
    const all = read()
    if (all[tourId] === 'done' && status === 'seen') return
    all[tourId] = status
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // localStorage unavailable (private browsing) — the parcourse simply
    // re-offers itself next visit.
  }
}

export function tourStatus(tourId: string): TourStatus {
  const value = read()[tourId]
  return value === 'done' || value === 'seen' ? value : 'new'
}

/** A tour counts as "seen" as soon as it starts — a refresh mid-tour won't
 *  auto-restart it on the next visit, but it stays relaunchable from the help
 *  menu. */
export function isTourSeen(tourId: string): boolean {
  return tourStatus(tourId) !== 'new'
}

export function markTourSeen(tourId: string): void {
  write(tourId, 'seen')
}

export function markTourDone(tourId: string): void {
  write(tourId, 'done')
}
