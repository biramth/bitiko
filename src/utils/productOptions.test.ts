import { describe, expect, it } from 'vitest'
import type { OptionField } from '@/types'
import { formatOptionsInline, optionsKey, parseOptionFields, parseOrderOptions, resolveSelection } from './productOptions'
import { buildWhatsAppMessage } from './whatsappMessage'
import { effectivePrice, priceRange } from './productPricing'

const ton: OptionField = { id: 'a', label: 'Ton', type: 'choice', required: true, choices: ['Rose', 'Bleu'] }
const prenom: OptionField = { id: 'b', label: 'Prénom', type: 'text', required: false, choices: [] }

describe('parseOptionFields', () => {
  it('keeps valid fields and drops malformed ones', () => {
    const parsed = parseOptionFields([
      ton,
      { id: 'x', label: '  ', type: 'text' },
      { id: 'y', label: 'Vide', type: 'choice', choices: [] },
      'junk',
      { id: 'z', label: 'Note', type: 'text', required: true },
    ])
    expect(parsed.map((f) => f.id)).toEqual(['a', 'z'])
    expect(parsed[1].required).toBe(true)
  })

  it('returns [] for non-arrays', () => {
    expect(parseOptionFields(null)).toEqual([])
    expect(parseOptionFields({})).toEqual([])
  })
})

describe('resolveSelection', () => {
  it('requires required fields', () => {
    const r = resolveSelection([ton], {})
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.fieldId).toBe('a')
  })

  it('accepts valid picks and skips empty optional fields', () => {
    const r = resolveSelection([ton, prenom], { a: 'Rose', b: '  ' })
    expect(r).toEqual({ ok: true, options: [{ fieldId: 'a', label: 'Ton', value: 'Rose' }] })
  })

  it('rejects a choice that is not listed', () => {
    expect(resolveSelection([ton], { a: 'Vert' }).ok).toBe(false)
  })

  it('trims free text', () => {
    const r = resolveSelection([prenom], { b: '  Awa ' })
    expect(r).toEqual({ ok: true, options: [{ fieldId: 'b', label: 'Prénom', value: 'Awa' }] })
  })
})

describe('cart line identity + formatting', () => {
  it('gives different keys to different picks, same key regardless of order', () => {
    const rose = [{ fieldId: 'a', label: 'Ton', value: 'Rose' }]
    const bleu = [{ fieldId: 'a', label: 'Ton', value: 'Bleu' }]
    expect(optionsKey(rose)).not.toBe(optionsKey(bleu))
    expect(optionsKey(undefined)).toBe('')
    const ab = [
      { fieldId: 'a', label: 'A', value: '1' },
      { fieldId: 'b', label: 'B', value: '2' },
    ]
    expect(optionsKey(ab)).toBe(optionsKey([...ab].reverse()))
  })

  it('formats and parses order options', () => {
    expect(formatOptionsInline([{ label: 'Ton', value: 'Rose' }, { label: 'Taille', value: 'M' }])).toBe('Ton : Rose · Taille : M')
    expect(parseOrderOptions([{ label: 'Ton', value: 'Rose' }, 3, { label: 1 }])).toEqual([{ label: 'Ton', value: 'Rose' }])
  })
})

describe('buildWhatsAppMessage', () => {
  const base = {
    orderNumber: 'CMD-12',
    total: 15000,
    customerName: 'Awa',
    customerPhone: '770000000',
    customerAddress: 'Dakar',
    formatCurrency: (n: number) => `${n} F`,
  }

  it('does not open with a greeting', () => {
    const msg = buildWhatsAppMessage({ ...base, items: [{ productName: 'Zey Set', unitPrice: 14000, quantity: 1, subtotal: 14000 }] })
    expect(msg.startsWith('Commande #CMD-12')).toBe(true)
    expect(msg.toLowerCase()).not.toContain('bonjour')
  })

  it('shows the variant and every option under the product', () => {
    const msg = buildWhatsAppMessage({
      ...base,
      items: [
        {
          productName: 'Zey Set',
          variantName: 'Taille M',
          options: [{ label: 'Ton', value: 'Rose' }, { label: 'Prénom', value: 'Awa' }],
          unitPrice: 14000,
          quantity: 2,
          subtotal: 28000,
        },
      ],
    })
    expect(msg).toContain('- Zey Set (Taille M) x2 — 28000 F')
    expect(msg).toContain('• Ton : Rose')
    expect(msg).toContain('• Prénom : Awa')
  })
})

describe('product pricing', () => {
  it('a variant without a price sells at the base price', () => {
    expect(effectivePrice({ price: 5000 }, { price: null })).toBe(5000)
    expect(effectivePrice({ price: 5000 }, { price: 7000 })).toBe(7000)
    expect(effectivePrice({ price: 5000 }, null)).toBe(5000)
  })

  it('advertises "from min" only when variant prices differ', () => {
    const p = { price: 5000, variants: [{ price: null, active: true, stock: 3 }, { price: 8000, active: true, stock: 1 }] }
    expect(priceRange(p)).toEqual({ min: 5000, max: 8000, hasRange: true })
    expect(priceRange({ price: 5000, variants: [{ price: 5000, active: true, stock: 1 }] }).hasRange).toBe(false)
    expect(priceRange({ price: 5000 })).toEqual({ min: 5000, max: 5000, hasRange: false })
  })

  it('ignores sold-out and inactive variants, unless everything is sold out', () => {
    const variants = [
      { price: 3000, active: true, stock: 0 },
      { price: 9000, active: true, stock: 2 },
      { price: 1000, active: false, stock: 5 },
    ]
    expect(priceRange({ price: 5000, variants }).min).toBe(9000)
    expect(priceRange({ price: 5000, variants: [{ price: 3000, active: true, stock: 0 }, { price: 4000, active: true, stock: 0 }] }).min).toBe(3000)
  })
})
