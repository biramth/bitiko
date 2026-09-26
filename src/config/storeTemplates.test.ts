import { describe, expect, it } from 'vitest'
import { availableVerticals, templatesForVertical } from './storeTemplates'

describe('business groups (10 groupes)', () => {
  it('exposes 10 verticals with at least one template', () => {
    expect(availableVerticals().map((v) => v.key)).toEqual([
      'restauration',
      'mode',
      'beaute',
      'epicerie',
      'tech',
      'deco',
      'cosmetiques',
      'epicerie_fine',
      'fleurs_cadeaux',
      'artisanat',
    ])
  })

  it('returns the exact template first for each group', () => {
    expect(templatesForVertical('restauration')[0]?.key).toBe('restauration')
    expect(templatesForVertical('artisanat')[0]?.key).toBe('artisanat')
    expect(templatesForVertical('cosmetiques')[0]?.key).toBe('cosmetiques')
    expect(templatesForVertical('epicerie_fine')[0]?.key).toBe('epicerie_fine')
    expect(templatesForVertical('fleurs_cadeaux')[0]?.key).toBe('fleurs_cadeaux')
    expect(templatesForVertical('mode')[0]?.key).toBe('mode')
  })

  it('offers several templates to Beauté & Bien-être', () => {
    expect(templatesForVertical('beaute').map((t) => t.key)).toEqual([
      'beaute',
      'coiffure',
      'barber',
      'institut',
    ])
  })

  it('resolves legacy slugs through their vertical', () => {
    expect(templatesForVertical('deco')[0]?.key).toBe('maison')
    expect(templatesForVertical('coiffure')[0]?.key).toBe('coiffure')
  })

  it('fails open to every template on unknown vertical', () => {
    expect(templatesForVertical('nope').length).toBeGreaterThan(10)
    expect(templatesForVertical(null).length).toBeGreaterThan(10)
  })
})
