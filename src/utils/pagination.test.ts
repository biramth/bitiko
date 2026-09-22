import { describe, expect, it } from 'vitest'
import { getPaginationItems } from './pagination'

describe('getPaginationItems', () => {
  it('returns nothing for a single page', () => {
    expect(getPaginationItems(1, 1)).toEqual([])
  })

  it('keeps every page when total is small', () => {
    expect(getPaginationItems(1, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('bridges a single-number gap with the missing page', () => {
    expect(getPaginationItems(4, 10)).toEqual([1, 2, 3, 4, 5, 6, 'ellipsis', 10])
  })

  it('keeps first and last page with ellipses for many pages', () => {
    expect(getPaginationItems(10, 20)).toEqual([1, 'ellipsis', 8, 9, 10, 11, 12, 'ellipsis', 20])
  })

  it('collapses to a prefix ending with one ellipsis at the first page', () => {
    expect(getPaginationItems(1, 20)).toEqual([1, 2, 3, 'ellipsis', 20])
  })

  it('works at the edges of the window', () => {
    expect(getPaginationItems(2, 3)).toEqual([1, 2, 3])
  })
})
