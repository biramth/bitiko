import type { CartItem, Shop } from '@/types'

/** Fixed dummy products shown inside an embedded preview iframe when the
 *  visitor's browser cart is empty, so the merchant sees a realistic-looking
 *  cart / checkout without having to manually populate one in dev. */
export function buildDemoCart(_shop: Shop): CartItem[] {
  return [
    {
      productId: 'demo-pagne',
      name: 'Robe en wax',
      slug: 'robe-en-wax',
      price: 18000,
      quantity: 1,
      imageUrl: null,
      stock: 10,
    },
    {
      productId: 'demo-boubou',
      name: 'Boubou brodé',
      slug: 'boubou-brode',
      price: 25000,
      quantity: 2,
      imageUrl: null,
      stock: 5,
    },
  ]
}
