import { describe, expect, it } from 'vitest'
import { monthStart } from './usage.js'

describe('monthStart', () => {
  it('returns the first day of the UTC month', () => {
    expect(monthStart(new Date(Date.UTC(2026, 8, 25, 14, 30)))).toBe('2026-09-01')
    expect(monthStart(new Date(Date.UTC(2026, 0, 1)))).toBe('2026-01-01')
    expect(monthStart(new Date(Date.UTC(2026, 11, 31, 23, 59)))).toBe('2026-12-01')
  })
})
