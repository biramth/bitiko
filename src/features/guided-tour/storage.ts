const STORAGE_KEY = 'bitiko-guided-tours'

function read(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

/** A tour counts as "seen" as soon as it starts — a refresh mid-tour won't
 *  auto-restart it on the next visit, but it stays relaunchable from the help
 *  menu. */
export function isTourSeen(tourId: string): boolean {
  return read()[tourId] === 'seen'
}

export function markTourSeen(tourId: string): void {
  try {
    const seen = read()
    seen[tourId] = 'seen'
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seen))
  } catch {
    // localStorage unavailable (private browsing) — the parcourse simply
    // re-offers itself next visit.
  }
}