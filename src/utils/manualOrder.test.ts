import { describe, expect, it } from 'vitest'
import type { ProductWithRelations } from '@/types'
import {
  cartSubtotal,
  effectivePrice,
  lineStock,
  lineSubtotal,
  toCartItems,
  toManualProduct,
  type ManualOrderLine,
  type ManualProduct,
} from './manualOrder'

const makeProduct = (overrides: Partial<ManualProduct> = {}): ManualProduct => ({
  id: 'p1',
  name: 'Chemise',
  slug: 'chemise',
  price: 5000,
  stock: 3,
  imageUrl: 'https://img.example/chemise.png',
  variants: [
    { id: 'v1', name: 'M', price: 5500, stock: 2 },
    { id: 'v2', name: 'L', price: null, stock: 1 },
  ],
  optionFields: [],
  ...overrides,
})

const makeLine = (overrides: Partial<ManualOrderLine> = {}): ManualOrderLine => ({
  product: makeProduct(),
  variant: null,
  quantity: 2,
  options: [{ fieldId: 'o1', label: 'Taille', value: 'M' }],
  ...overrides,
})

describe('effectivePrice', () => {
  it('uses the variant price when a variant is set', () => {
    expect(effectivePrice(makeLine({ variant: makeProduct().variants[0] }))).toBe(5500)
  })

  it('falls back to the product price for variants without their own price', () => {
    expect(effectivePrice(makeLine({ variant: makeProduct().variants[1] }))).toBe(5000)
  })

  it('uses the product price when no variant', () => {
    expect(effectivePrice(makeLine())).toBe(5000)
  })
})

describe('lineStock', () => {
  it('uses the variant stock when set', () => {
    expect(lineStock(makeLine({ variant: makeProduct().variants[0] }))).toBe(2)
  })

  it('falls back to the product stock', () => {
    expect(lineStock(makeLine())).toBe(3)
  })
})

describe('lineSubtotal', () => {
  it('multiplies the effective price by the quantity', () => {
    expect(lineSubtotal(makeLine())).toBe(10_000)
    expect(lineSubtotal(makeLine({ variant: makeProduct().variants[0] }))).toBe(11_000)
  })
})

describe('toCartItems', () => {
  it('maps a variant line with its price, stock and options', () => {
    const items = toCartItems([makeLine({ variant: makeProduct().variants[0] })])
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      productId: 'p1',
      variantId: 'v1',
      variantName: 'M',
      name: 'Chemise',
      price: 5500,
      quantity: 2,
      stock: 2,
      imageUrl: 'https://img.example/chemise.png',
    })
    expect(items[0].options).toEqual([{ fieldId: 'o1', label: 'Taille', value: 'M' }])
  })

  it('keeps product-level price/stock when no variant', () => {
    const [item] = toCartItems([makeLine()])
    expect(item.variantId).toBeUndefined()
    expect(item.price).toBe(5000)
    expect(item.stock).toBe(3)
  })

  it('returns an empty array for no lines', () => {
    expect(toCartItems([])).toEqual([])
  })
})

describe('cartSubtotal', () => {
  it('sums every line', () => {
    const items = toCartItems([
      makeLine({ variant: makeProduct().variants[0], quantity: 1 }),
      makeLine({ product: makeProduct({ price: 1500 }), variant: null, quantity: 4 }),
    ])
    expect(cartSubtotal(items)).toBe(11_500)
  })

  it('returns 0 for an empty cart', () => {
    expect(cartSubtotal([])).toBe(0)
  })
})

describe('toManualProduct', () => {
  const raw = {
    id: 'p1',
    name: 'Chemise',
    slug: 'chemise',
    price: 5000,
    stock: 10,
    images: [{ public_url: 'https://img.example/c.png' }],
    variants: [{ id: 'v1', name: 'M', price: 5500, stock: 2 }],
    option_fields: [
      { id: 'o1', label: 'Taille', type: 'choice', required: true, choices: ['M', 'L'] },
      { id: 'o2', label: 'Couleur', type: 'text', required: false, choices: [] },
    ],
  } as unknown as ProductWithRelations

  it('maps the first image and parses option fields', () => {
    const p = toManualProduct(raw)
    expect(p.imageUrl).toBe('https://img.example/c.png')
    expect(p.variants).toEqual([{ id: 'v1', name: 'M', price: 5500, stock: 2 }])
    expect(p.optionFields).toHaveLength(2)
    expect(p.optionFields[0]).toEqual({
      id: 'o1',
      label: 'Taille',
      type: 'choice',
      required: true,
      choices: ['M', 'L'],
    })
  })

  it('tolerates missing option_fields', () => {
    const p = toManualProduct({ ...raw, option_fields: null } as unknown as ProductWithRelations)
    expect(p.optionFields).toEqual([])
  })

  it('tolerates a missing image', () => {
    const p = toManualProduct({ ...raw, images: [] } as unknown as ProductWithRelations)
    expect(p.imageUrl).toBeNull()
  })
})