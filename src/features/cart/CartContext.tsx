import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CART_STORAGE_KEY } from '@/config/constants'
import { useTenant } from '@/features/tenant/TenantContext'
import { optionsKey, parseOptionFields, resolveSelection } from '@/utils/productOptions'
import type { CartItem } from '@/types'

interface CartContextValue {
  items: CartItem[]
  itemCount: number
  subtotal: number
  addItem: (item: CartItem) => void
  updateQuantity: (line: CartLineRef, quantity: number) => void
  removeItem: (line: CartLineRef) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

function storageKey(shopId: string | undefined) {
  return `${CART_STORAGE_KEY}:${shopId ?? 'none'}`
}

function readCart(shopId: string | undefined): CartItem[] {
  try {
    const raw = localStorage.getItem(storageKey(shopId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Identifies one cart line: product + variant + the customer's option picks
 *  ("Ton: Rose" and "Ton: Bleu" of the same product are separate lines). */
export type CartLineRef = Pick<CartItem, 'productId' | 'variantId' | 'options'>

function sameLine(a: CartLineRef, b: CartLineRef) {
  return (
    a.productId === b.productId &&
    (a.variantId ?? null) === (b.variantId ?? null) &&
    optionsKey(a.options) === optionsKey(b.options)
  )
}

export function CartProvider({ children }: { children: ReactNode }) {
  // Real subdomains already isolate localStorage per shop; this key also
  // keeps carts separate when previewing several shops on the same
  // localhost origin via ?boutique=<slug> during development.
  const { shop } = useTenant()
  const shopId = shop?.id
  const [items, setItems] = useState<CartItem[]>(() => readCart(shopId))

  useEffect(() => {
    setItems(readCart(shopId))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId])

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(shopId), JSON.stringify(items))
    } catch {
      // localStorage unavailable (private mode, quota) — cart just won't persist
    }
  }, [items, shopId])

  const addItem = (item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => sameLine(i, item))
      if (existing) {
        const nextQuantity = Math.min(existing.quantity + item.quantity, existing.stock)
        return prev.map((i) =>
          sameLine(i, item) ? { ...i, quantity: nextQuantity } : i,
        )
      }
      return [...prev, { ...item, quantity: Math.min(item.quantity, item.stock) }]
    })
  }

  const updateQuantity = (line: CartLineRef, quantity: number) => {
    setItems((prev) =>
      prev.map((i) =>
        sameLine(i, line)
          ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock)) }
          : i,
      ),
    )
  }

  const removeItem = (line: CartLineRef) => {
    setItems((prev) => prev.filter((i) => !sameLine(i, line)))
  }

  const clear = () => setItems([])

  // Keep prices/stocks in the cart in sync with the database: a merchant can
  // change a price or run out of stock while a customer still has items in
  // their cart. Stale items (deactivated or deleted products/variants) are
  // removed, and quantities above the available stock are clamped. When a
  // line points to a variant, the variant's price/stock win over the parent.
  const productIds = useMemo(() => [...new Set(items.map((i) => i.productId))], [items])
  const syncKey = productIds.slice().sort().join(',')

  const { data: synced } = useQuery({
    queryKey: ['cart-sync', shopId, syncKey],
    // product.service (supabase-js) stays out of the initial bundle — it only
    // downloads once a visitor actually has items to sync.
    queryFn: () => import('@/services/product.service').then((m) => m.listProductsByIds(productIds)),
    enabled: productIds.length > 0,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (!synced) return
    setItems((prev) => {
      let changed = false
      const next = prev
        .map((item) => {
          const current = synced.find(
            (p) =>
              p.id === item.productId &&
              p.active &&
              (!item.variantId ||
                p.variants.some((v) => v.id === item.variantId && v.active)),
          )
          if (!current) {
            changed = true
            return null
          }

          // The merchant may have edited the product's option fields since the
          // customer picked — a line whose picks no longer fit must be redone.
          const picked = Object.fromEntries((item.options ?? []).map((o) => [o.fieldId, o.value]))
          const check = resolveSelection(parseOptionFields(current.option_fields), picked)
          if (!check.ok || check.options.length !== (item.options ?? []).length) {
            changed = true
            return null
          }

          let updated = item
          let stock = current.stock

          if (item.variantId) {
            const variant = current.variants.find((v) => v.id === item.variantId)
            if (!variant || variant.stock <= 0) {
              changed = true
              return null
            }
            stock = variant.stock
            const price = variant.price ?? current.price
            if (price !== item.price) {
              changed = true
              updated = { ...updated, price }
            }
          } else {
            if (current.stock <= 0) {
              changed = true
              return null
            }
            if (current.price !== item.price) {
              changed = true
              updated = { ...updated, price: current.price }
            }
          }

          if (stock !== updated.stock) {
            changed = true
            updated = { ...updated, stock }
          }
          const quantity = Math.min(item.quantity, stock)
          if (quantity !== updated.quantity) {
            changed = true
            updated = { ...updated, quantity }
          }
          return updated
        })
        .filter((i): i is CartItem => i !== null)
      return changed ? next : prev
    })
  }, [synced])

  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items])
  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity * i.price, 0),
    [items],
  )

  return (
    <CartContext.Provider
      value={{ items, itemCount, subtotal, addItem, updateQuantity, removeItem, clear }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}