import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CART_STORAGE_KEY } from '@/config/constants'
import { useTenant } from '@/features/tenant/TenantContext'
import { listProductsByIds } from '@/services/product.service'
import type { CartItem } from '@/types'

interface CartContextValue {
  items: CartItem[]
  itemCount: number
  subtotal: number
  addItem: (item: CartItem) => void
  updateQuantity: (productId: string, quantity: number) => void
  removeItem: (productId: string) => void
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
      const existing = prev.find((i) => i.productId === item.productId)
      if (existing) {
        const nextQuantity = Math.min(existing.quantity + item.quantity, existing.stock)
        return prev.map((i) =>
          i.productId === item.productId ? { ...i, quantity: nextQuantity } : i,
        )
      }
      return [...prev, { ...item, quantity: Math.min(item.quantity, item.stock) }]
    })
  }

  const updateQuantity = (productId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId
          ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock)) }
          : i,
      ),
    )
  }

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId))
  }

  const clear = () => setItems([])

  // Keep prices/stocks in the cart in sync with the database: a merchant can
  // change a price or run out of stock while a customer still has items in
  // their cart. Stale items (deactivated or deleted products) are removed,
  // and quantities above the available stock are clamped.
  const productIds = useMemo(() => [...new Set(items.map((i) => i.productId))], [items])
  const syncKey = productIds.slice().sort().join(',')

  const { data: synced } = useQuery({
    queryKey: ['cart-sync', shopId, syncKey],
    queryFn: () => listProductsByIds(productIds),
    enabled: productIds.length > 0,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (!synced) return
    setItems((prev) => {
      let changed = false
      const next = prev
        .map((item) => {
          const current = synced.find((p) => p.id === item.productId && p.active)
          if (!current || current.stock <= 0) {
            changed = true
            return null
          }
          let updated = item
          if (current.price !== item.price) {
            changed = true
            updated = { ...updated, price: current.price }
          }
          const quantity = Math.min(item.quantity, current.stock)
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
