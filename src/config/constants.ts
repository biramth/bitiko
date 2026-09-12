export const CART_STORAGE_KEY = 'boutique:cart'
export const PRODUCTS_PAGE_SIZE = 12
export const ORDERS_PAGE_SIZE = 20

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
