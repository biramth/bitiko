import { supabase } from '@/lib/supabaseClient'
import { ORDERS_PAGE_SIZE } from '@/config/constants'
import type { CartItem, Order, OrderStatus, OrderWithItems, PaymentMethod } from '@/types'

export interface CreateOrderInput {
  shopId: string
  customerName: string
  customerPhone: string
  customerAddress: string
  items: CartItem[]
  deliveryFee: number
  deliveryZoneName: string
  paymentMethod: PaymentMethod
}

export interface CreateOrderResult {
  orderId: string
  orderNumber: string
  total: number
  items: {
    productName: string
    variantName?: string | null
    unitPrice: number
    quantity: number
    subtotal: number
  }[]
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
    p_customer_address: input.customerAddress,
    p_items: input.items.map((i) => ({
      product_id: i.productId,
      variant_id: i.variantId ?? null,
      quantity: i.quantity,
    })),
    p_delivery_fee: input.deliveryFee,
    p_delivery_zone_name: input.deliveryZoneName,
    p_payment_method: input.paymentMethod,
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

export async function listOrders(
  shopId: string,
  page = 1,
  status?: OrderStatus,
): Promise<{ orders: Order[]; total: number }> {
  const from = (page - 1) * ORDERS_PAGE_SIZE
  const to = from + ORDERS_PAGE_SIZE - 1

  let query = supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .eq('shop_id', shopId)

  if (status) query = query.eq('status', status)

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error
  return { orders: (data ?? []) as Order[], total: count ?? 0 }
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

export interface OrderStatusCounts {
  counts: Record<OrderStatus, number>
  total: number
}

export async function getOrderStatusCounts(shopId: string): Promise<OrderStatusCounts> {
  const { data, error } = await supabase
    .from('orders')
    .select('status')
    .eq('shop_id', shopId)
  if (error) throw error

  const counts: Record<OrderStatus, number> = {
    pending: 0,
    confirmed: 0,
    paid: 0,
    cancelled: 0,
    delivered: 0,
  }
  for (const row of data ?? []) {
    counts[row.status as OrderStatus] += 1
  }
  return { counts, total: (data ?? []).length }
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  const { data, error } = await supabase.rpc('set_order_status', {
    p_order_id: id,
    p_status: status,
  })
  if (error) throw error
  return data as Order
}

/** Adjusts an order's delivery fee after a phone confirmation (recomputes the total). */
export async function updateOrderDeliveryFee(id: string, fee: number): Promise<Order> {
  const { data, error } = await supabase.rpc('set_order_delivery_fee', {
    p_order_id: id,
    p_fee: fee,
  })
  if (error) throw error
  return data as Order
}

export function buildWhatsAppMessage(params: {
  orderNumber: string
  items: {
    productName: string
    variantName?: string | null
    unitPrice: number
    quantity: number
    subtotal: number
  }[]
  deliveryFee?: number
  deliveryZoneName?: string
  paymentMethod?: PaymentMethod
  paymentInstructions?: string | null
  total: number
  customerName: string
  customerPhone: string
  customerAddress: string
  formatCurrency: (amount: number) => string
}): string {
  const lines = [
    `Bonjour, je souhaite passer la commande #${params.orderNumber}.`,
    '',
    'Produits :',
    ...params.items.map((i) => {
      const label = i.variantName ? `${i.productName} (${i.variantName})` : i.productName
      return `- ${label} x${i.quantity} — ${params.formatCurrency(i.subtotal)}`
    }),
  ]
  if (params.deliveryZoneName) {
    lines.push('', `Zone de livraison : ${params.deliveryZoneName}`)
  }
  if (params.deliveryFee && params.deliveryFee > 0) {
    lines.push(`Livraison : ${params.formatCurrency(params.deliveryFee)}`)
  }
  lines.push('', `Total : ${params.formatCurrency(params.total)}`)
  lines.push(
    params.paymentMethod === 'mobile_money'
      ? 'Paiement : Mobile money (Wave / Orange Money) avant envoi.'
      : 'Paiement : Espèces à la livraison.',
  )
  if (params.paymentMethod === 'mobile_money' && params.paymentInstructions?.trim()) {
    lines.push(params.paymentInstructions.trim())
  }
  lines.push(
    `Nom : ${params.customerName}`,
    `Téléphone : ${params.customerPhone}`,
    `Adresse : ${params.customerAddress}`,
    'Merci.',
  )
  return lines.join('\n')
}

export function buildWhatsAppUrl(whatsappNumber: string, message: string): string {
  const digitsOnly = whatsappNumber.replace(/[^0-9]/g, '')
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`
}
