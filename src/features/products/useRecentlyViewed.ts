import { useState } from 'react'

export interface RecentlyViewedEntry {
  id: string
  slug: string
  name: string
  price: number
  imageUrl: string | null
}

const STORAGE_KEY = 'bitiko:recently-viewed'
export const RECENTLY_VIEWED_MAX_ITEMS = 8

/** Moves `current` to the front of `existing` (de-duped by id) and caps the
 *  result — pulled out of the hook so the ordering/cap/de-dup rules are unit
 *  testable without a DOM or a React renderer. */
export function mergeRecentlyViewed(
  current: RecentlyViewedEntry,
  existing: RecentlyViewedEntry[],
  max: number = RECENTLY_VIEWED_MAX_ITEMS,
): RecentlyViewedEntry[] {
  return [current, ...existing.filter((p) => p.id !== current.id)].slice(0, max)
}

function readStored(): RecentlyViewedEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persist(items: RecentlyViewedEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // private browsing / quota exceeded — skip persisting silently
  }
}

/**
 * Tracks the product currently being viewed in localStorage (scoped to the
 * shop's own subdomain origin, so shops never see each other's history) and
 * returns the rest of the list for a "recently viewed" row. A client-only
 * nice-to-have — failures (private browsing, quota) just mean an empty row.
 */
export function useRecentlyViewed(current: RecentlyViewedEntry | null): RecentlyViewedEntry[] {
  const [items, setItems] = useState<RecentlyViewedEntry[]>(() => readStored())
  const [trackedId, setTrackedId] = useState<string | null>(null)

  // Record the product being viewed the moment it changes — adjusted during
  // render (React's documented pattern for syncing state to a changed prop)
  // rather than in an effect, so the row below is correct on the very first
  // paint of each product page instead of one render behind.
  if (current && current.id !== trackedId) {
    setTrackedId(current.id)
    const next = mergeRecentlyViewed(current, items)
    setItems(next)
    persist(next)
  }

  return items.filter((p) => p.id !== current?.id)
}
