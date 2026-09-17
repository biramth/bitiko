import type { OrderStatus } from '@/types'

export const CART_STORAGE_KEY = 'boutique:cart'
export const PRODUCTS_PAGE_SIZE = 12
export const ADMIN_PRODUCTS_PAGE_SIZE = 20
export const ORDERS_PAGE_SIZE = 20

/**
 * Mirrors `PLATFORM_ADMIN_EMAILS` in api/_lib/supabaseAdmin.ts. Client-side
 * use is UX only (e.g. sending this account straight to /super-admin after
 * login) — real authorization is enforced server-side (RPCs + api/admin/*),
 * never rely on this list for anything security-sensitive.
 */
export const PLATFORM_ADMIN_EMAILS = ['papebiramethiombanee@gmail.com']

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  paid: 'Payée',
  cancelled: 'Annulée',
  delivered: 'Livrée',
}

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  paid: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
  delivered: 'bg-violet-100 text-violet-800',
}

/**
 * Allowed order-status moves, mirroring the workflow enforced server-side by
 * `set_order_status()` (see supabase/migrations/0006_merchant_tools.sql).
 * Terminal states (delivered, cancelled) have no allowed moves.
 */
export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['pending', 'confirmed', 'paid', 'cancelled'],
  confirmed: ['confirmed', 'paid', 'delivered', 'cancelled'],
  paid: ['paid', 'delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

/** The happy-path workflow shown as a timeline in the private area. */
export const ORDER_STATUS_FLOW: OrderStatus[] = ['pending', 'confirmed', 'paid', 'delivered']

/** Next status along the happy path (pending → confirmed → paid → delivered), or null at the end. */
export function getLinearNext(status: OrderStatus): OrderStatus | null {
  const index = ORDER_STATUS_FLOW.indexOf(status)
  if (index === -1 || index === ORDER_STATUS_FLOW.length - 1) return null
  return ORDER_STATUS_FLOW[index + 1]
}

/** Action labels for a single-click status move (used in lists and detail). */
export const ORDER_STATUS_ACTION_LABELS: Record<OrderStatus, string> = {
  pending: '',
  confirmed: 'Confirmer',
  paid: 'Marquer payée',
  delivered: 'Marquer livrée',
  cancelled: 'Annuler',
}
