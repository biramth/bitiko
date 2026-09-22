import type { ProductWithRelations, CartItem, OptionField, SelectedOption } from '@/types'
import { parseOptionFields } from './productOptions'

/** A product in the merchant's "write an order" picker — a slim shape pulled
 *  from `ProductWithRelations` so the page and its tests stay decoupled. */
export interface ManualVariant {
  id: string
  name: string
  price: number | null
  stock: number
}

export interface ManualProduct {
  id: string
  name: string
  slug: string
  price: number
  stock: number
  imageUrl: string | null
  variants: ManualVariant[]
  optionFields: OptionField[]
}

export interface ManualOrderLine {
  product: ManualProduct
  variant: ManualVariant | null
  quantity: number
  options: SelectedOption[]
}

export function toManualProduct(p: ProductWithRelations): ManualProduct {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: Number(p.price),
    stock: p.stock,
    imageUrl: p.images[0]?.public_url ?? null,
    variants: p.variants.map((v) => ({
      id: v.id,
      name: v.name,
      price: v.price != null ? Number(v.price) : null,
      stock: v.stock,
    })),
    optionFields: parseOptionFields(p.option_fields),
  }
}

/** Price actually charged for one unit of the line (variant price wins). */
export function effectivePrice(line: ManualOrderLine): number {
  return line.variant?.price ?? line.product.price
}

/** Units left to sell for this line (0 when product/variant unstocked). */
export function lineStock(line: ManualOrderLine): number {
  return line.variant?.stock ?? line.product.stock
}

export function lineSubtotal(line: ManualOrderLine): number {
  return effectivePrice(line) * line.quantity
}

/** Converts the merchant's selection into the `CartItem[]` the checkout
 *  `create_order` RPC expects (it re-reads price/stock server-side anyway). */
export function toCartItems(lines: ManualOrderLine[]): CartItem[] {
  return lines.map((line) => ({
    productId: line.product.id,
    variantId: line.variant?.id,
    variantName: line.variant?.name,
    options: line.options,
    name: line.product.name,
    slug: line.product.slug,
    price: effectivePrice(line),
    quantity: line.quantity,
    imageUrl: line.product.imageUrl,
    stock: lineStock(line),
  }))
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}