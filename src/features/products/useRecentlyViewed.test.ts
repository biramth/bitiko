import { describe, expect, it } from 'vitest'
import { mergeRecentlyViewed, type RecentlyViewedEntry } from './useRecentlyViewed'

function entry(id: string): RecentlyViewedEntry {
  return { id, slug: `slug-${id}`, name: `Produit ${id}`, price: 1000, imageUrl: null }
}

describe('mergeRecentlyViewed', () => {
  it('puts the current product first', () => {
    expect(mergeRecentlyViewed(entry('a'), [])).toEqual([entry('a')])
  })

  it('moves an already-seen product to the front instead of duplicating it', () => {
    const result = mergeRecentlyViewed(entry('b'), [entry('a'), entry('b'), entry('c')])
    expect(result).toEqual([entry('b'), entry('a'), entry('c')])
  })

  it('keeps the rest of the list in its existing order', () => {
    const result = mergeRecentlyViewed(entry('d'), [entry('a'), entry('b'), entry('c')])
    expect(result).toEqual([entry('d'), entry('a'), entry('b'), entry('c')])
  })

  it('caps the result at the given max, dropping the oldest entries', () => {
    const existing = [entry('a'), entry('b'), entry('c')]
    expect(mergeRecentlyViewed(entry('d'), existing, 3)).toEqual([entry('d'), entry('a'), entry('b')])
  })

  it('defaults to the module cap when none is given', () => {
    const existing = Array.from({ length: 10 }, (_, i) => entry(`p${i}`))
    expect(mergeRecentlyViewed(entry('new'), existing)).toHaveLength(8)
  })
})
