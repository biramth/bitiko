import { describe, expect, it } from 'vitest'
import { groupCapabilitiesByCategory, type Capability } from './businessType.service'

function cap(code: string, category: string, label = code): Capability {
  return { id: code, code, label, description: null, category, status: 'active' }
}

describe('groupCapabilitiesByCategory', () => {
  it('groups by category and sorts groups and items (fr)', () => {
    const groups = groupCapabilitiesByCategory([
      cap('HAS_SHOP', 'commerce', 'Boutique'),
      cap('HAS_APPOINTMENTS', 'rendez-vous', 'Rendez-vous'),
      cap('HAS_PRODUCTS', 'commerce', 'Produits'),
    ])
    expect(groups.map((g) => g.category)).toEqual(['commerce', 'rendez-vous'])
    expect(groups[0]?.items.map((i) => i.code)).toEqual(['HAS_SHOP', 'HAS_PRODUCTS'])
  })

  it('returns an empty list when there is nothing to group', () => {
    expect(groupCapabilitiesByCategory([])).toEqual([])
  })
})
