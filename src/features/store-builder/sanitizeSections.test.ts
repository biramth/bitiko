import { describe, expect, it } from 'vitest'
import {
  sanitizeSections,
  sectionVisibleForCapabilities,
  sectionVisibleWithRegistry,
} from './sanitizeSections'

describe('sanitizeSections', () => {
  it('returns an empty list for non-array input', () => {
    expect(sanitizeSections(null)).toEqual([])
    expect(sanitizeSections({})).toEqual([])
    expect(sanitizeSections('hero')).toEqual([])
  })

  it('drops structurally invalid entries but keeps unknown types', () => {
    const out = sanitizeSections([
      { id: 'a', type: 'hero', visible: true, config: {} },
      null,
      'nope',
      { id: '', type: 'hero', config: {} },
      { id: 'b', config: {} },
      { id: 'c', type: 'future-block', visible: true, config: { x: 1 } },
    ])
    expect(out.map((s) => s.id)).toEqual(['a', 'c'])
  })

  it('normalizes visible and config without touching valid sections', () => {
    const out = sanitizeSections([{ id: 'a', type: 'text', config: null }])
    expect(out[0]).toMatchObject({ id: 'a', type: 'text', visible: true, config: {} })
  })
})

describe('sectionVisibleForCapabilities', () => {
  it('shows sections without requirements, even with an empty set', () => {
    expect(sectionVisibleForCapabilities({}, new Set())).toBe(true)
    expect(sectionVisibleForCapabilities({ capabilities: [] }, new Set())).toBe(true)
  })

  it('fails open when capabilities are unknown', () => {
    expect(sectionVisibleForCapabilities({ capabilities: ['HAS_ORDERS'] }, null)).toBe(true)
  })

  it('requires every listed capability when known', () => {
    const section = { capabilities: ['HAS_PRODUCTS', 'HAS_ORDERS'] }
    expect(sectionVisibleForCapabilities(section, new Set(['HAS_PRODUCTS', 'HAS_ORDERS']))).toBe(true)
    expect(sectionVisibleForCapabilities(section, new Set(['HAS_PRODUCTS']))).toBe(false)
  })
})

describe('sectionVisibleWithRegistry', () => {
  it('gates on the registry definition when the instance carries none', () => {
    expect(sectionVisibleWithRegistry({}, ['HAS_SERVICES'], new Set(['HAS_SERVICES']))).toBe(true)
    expect(sectionVisibleWithRegistry({}, ['HAS_SERVICES'], new Set(['HAS_PRODUCTS']))).toBe(false)
  })

  it('requires both instance and registry capabilities', () => {
    const section = { capabilities: ['HAS_SHOP'] }
    expect(sectionVisibleWithRegistry(section, ['HAS_SERVICES'], new Set(['HAS_SHOP', 'HAS_SERVICES']))).toBe(true)
    expect(sectionVisibleWithRegistry(section, ['HAS_SERVICES'], new Set(['HAS_SERVICES']))).toBe(false)
    expect(sectionVisibleWithRegistry(section, ['HAS_SERVICES'], new Set(['HAS_SHOP']))).toBe(false)
  })

  it('fails open when capabilities are unknown', () => {
    expect(sectionVisibleWithRegistry({}, ['HAS_SERVICES'], null)).toBe(true)
    expect(sectionVisibleWithRegistry({ capabilities: ['HAS_ORDERS'] }, ['HAS_SERVICES'], null)).toBe(true)
  })
})
