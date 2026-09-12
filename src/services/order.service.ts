import { supabase } from '@/lib/supabaseClient'
import { ORDERS_PAGE_SIZE } from '@/config/constants'
import type { CartItem, Order, OrderStatus, OrderWithItems } from '@/types'

export interface CreateOrderInput {
  shopId: string
  customerName: string
  customerPhone: string
  items: CartItem[]
}

export interface CreateOrderResult {
  orderId: string
  orderNumber: string
  total: number
  items: { productName: string; unitPrice: number; quantity: number; subtotal: number }[]
}

interface CreateOrderRpcRow {
  order_id: string
  order_number: string
  total: number
  product_name: string
  unit_price: number
  quantity: number
  subtotal: number
}

/**
 * Calls the `create_order` Postgres function (SECURITY DEFINER), which
 * re-reads prices/stock from the database inside a transaction and computes
 * the authoritative total — the browser's cart values are never trusted for
 * money or stock. See supabase/migrations/0002_create_order_function.sql.
 */
export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const { data, error } = await supabase.rpc('create_order', {
    p_shop_id: input.shopId,
    p_customer_name: input.customerName,
    p_customer_phone: input.customerPhone,
    p_items: input.items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
  })

  if (error) throw error

  const rows = data as CreateOrderRpcRow[]
  if (!rows || rows.length === 0) throw new Error('La commande n\'a pas pu être créée.')

  return {
    orderId: rows[0].order_id,
    orderNumber: rows[0].order_number,
    total: Number(rows[0].total),
    items: rows.map((r) => ({
      productName: r.product_name,
      unitPrice: Number(r.unit_price),
      quantity: r.quantity,
      subtotal: Number(r.subtotal),
    })),
  }
}

export async function listOrders(shopId: string, page = 1): Promise<{ orders: Order[]; total: number }> {
  const from = (page - 1) * ORDERS_PAGE_SIZE
  const to = from + ORDERS_PAGE_SIZE - 1

  const { data, error, count } = await supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })
    .range(from, to)
  if (error) throw error
  return { orders: data ?? [], total: count ?? 0 }
}

export async function getOrderById(id: string): Promise<OrderWithItems | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data as OrderWithItems | null
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export function buildWhatsAppMessage(params: {
  orderNumber: string
  items: { productName: string; unitPrice: number; quantity: number; subtotal: number }[]
  total: number
  customerName: string
  customerPhone: string
  formatCurrency: (amount: number) => string
}): string {
  const lines = [
    `Bonjour, je souhaite passer la commande #${params.orderNumber}.`,
    '',
    'Produits :',
    ...params.items.map(
      (i) => `- ${i.productName} x${i.quantity} — ${params.formatCurrency(i.subtotal)}`,
    ),
    '',
    `Total : ${params.formatCurrency(params.total)}`,
    `Nom : ${params.customerName}`,
    `Téléphone : ${params.customerPhone}`,
    'Merci.',
  ]
  return lines.join('\n')
}

export function buildWhatsAppUrl(whatsappNumber: string, message: string): string {
  const digitsOnly = whatsappNumber.replace(/[^0-9]/g, '')
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`
}
