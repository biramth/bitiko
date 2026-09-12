import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CART_STORAGE_KEY } from '@/config/constants'
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

function readCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => readCart())

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    } catch {
      // localStorage unavailable (private mode, quota) — cart just won't persist
    }
  }, [items])

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
