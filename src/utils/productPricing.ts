interface PriceVariant {
  price: number | null
  active: boolean
  stock: number
}

/** A variant without its own price sells at the product's base price. */
export function effectivePrice(product: { price: number }, variant?: { price: number | null } | null): number {
  return variant?.price ?? product.price
}

/** Price to advertise for a product: the single price, or "from min" when
 *  variants are priced differently. Only sellable variants (active, in stock)
 *  count, falling back to all active ones when everything is sold out so a
 *  card never shows a misleading base price. */
export function priceRange(product: { price: number; variants?: PriceVariant[] | null }): {
  min: number
  max: number
  hasRange: boolean
} {
  const active = (product.variants ?? []).filter((v) => v.active)
  if (active.length === 0) return { min: product.price, max: product.price, hasRange: false }
  const sellable = active.filter((v) => v.stock > 0)
  const prices = (sellable.length > 0 ? sellable : active).map((v) => effectivePrice(product, v))
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return { min, max, hasRange: min !== max }
}
