import { describe, expect, it } from 'vitest'
import { resolveTemplateVariant } from '@/types/builder'
import { availableVerticals, STORE_TEMPLATE_BY_KEY, templatesForVertical } from './storeTemplates'

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

  it('offers at least two templates per group', () => {
    for (const vertical of availableVerticals()) {
      const templates = templatesForVertical(vertical.key)
      expect(templates.length, vertical.key).toBeGreaterThanOrEqual(2)
    }
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
      'onglerie',
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

describe('gabarit hybride Beauté', () => {
  const types = STORE_TEMPLATE_BY_KEY['beaute']!.layout.home.map((section) => section.type)

  it('réunit prestations, rendez-vous et boutique', () => {
    expect(types).toEqual(expect.arrayContaining(['services', 'team', 'appointments', 'products']))
  })

  it('garde le header en premier et le footer en dernier', () => {
    expect(types[0]).toBe('header')
    expect(types.at(-1)).toBe('footer')
  })
})

describe('gabarits restauration', () => {
  for (const key of ['restauration', 'bistrot']) {
    const home = STORE_TEMPLATE_BY_KEY[key]!.layout.home.map((section) => section.type)

    it(`${key} : carte + réservation, sans doublon produits`, () => {
      expect(home).toEqual(expect.arrayContaining(['menu', 'reservations']))
      expect(home).not.toContain('products')
    })
  }
})

describe('gabarits salon', () => {
  for (const key of ['coiffure', 'barber', 'institut', 'onglerie']) {
    const template = STORE_TEMPLATE_BY_KEY[key]!

    it(`${key} : rendez-vous + rayon boutique, catalogue nommé « La boutique »`, () => {
      const home = template.layout.home.map((section) => section.type)
      expect(home).toEqual(expect.arrayContaining(['appointments', 'products']))
      const catalogue = template.layout.catalogue[0]
      expect(catalogue?.type === 'products' && catalogue.config.heading).toBe('La boutique')
    })
  }
})

describe('tous les gabarits', () => {
  for (const template of Object.values(STORE_TEMPLATE_BY_KEY)) {
    const home = template.layout.home.map((section) => section.type)

    it(`${template.key} : header en tête, footer en pied, du contenu à montrer`, () => {
      expect(home[0]).toBe('header')
      expect(home.at(-1)).toBe('footer')
      expect(home.some((type) => ['products', 'menu', 'services'].includes(type))).toBe(true)
    })

    it(`${template.key} : la page catalogue liste bien des produits`, () => {
      expect(template.layout.catalogue[0]?.type).toBe('products')
    })
  }
})

describe('resolveTemplateVariant', () => {
  const barber = STORE_TEMPLATE_BY_KEY['barber']!

  it('resolves a variant to the base layout with the variant theme', () => {
    const resolved = resolveTemplateVariant(barber, 'cuir')
    expect(resolved.key).toBe('barber')
    expect(resolved.variantKey).toBe('cuir')
    expect(resolved.variantLabel).toBe('Cuir & Laiton')
    expect(resolved.themeColor).toBe('#92400e')
    expect(resolved.layout).toBe(barber.layout)
  })

  it('returns the base design on empty or unknown variant', () => {
    for (const key of [null, undefined, '', 'nope']) {
      const resolved = resolveTemplateVariant(barber, key)
      expect(resolved.variantKey).toBeUndefined()
      expect(resolved.themeColor).toBe(barber.themeColor)
      expect(resolved.themeConfig).toBe(barber.themeConfig)
    }
  })

  it('clears a previous resolution when going back to base', () => {
    const resolved = resolveTemplateVariant(resolveTemplateVariant(barber, 'cuir'), null)
    expect(resolved.variantKey).toBeUndefined()
    expect(resolved).not.toHaveProperty('variantLabel')
  })
})
