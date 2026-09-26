import { supabase } from '@/lib/supabaseClient'
import { kickAutomations } from '@/services/bookingNotify.service'
import { ORDERS_PAGE_SIZE } from '@/config/constants'
import { parseOrderOptions } from '@/utils/productOptions'
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
    options: { label: string; value: string }[]
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
  variant_name: string | null
  options: unknown
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
      options: (i.options ?? []).map((o) => ({ field_id: o.fieldId, value: o.value })),
    })),
    p_delivery_fee: input.deliveryFee,
    p_delivery_zone_name: input.deliveryZoneName,
    p_payment_method: input.paymentMethod,
  })

  if (error) throw error

  const rows = data as CreateOrderRpcRow[]
  if (!rows || rows.length === 0) throw new Error('La commande n\'a pas pu être créée.')

  // Prévient le marchand tout de suite (email d'alerte) au lieu d'attendre le cron quotidien.
  void kickAutomations(input.shopId)

  return {
    orderId: rows[0].order_id,
    orderNumber: rows[0].order_number,
    total: Number(rows[0].total),
    items: rows.map((r) => ({
      productName: r.product_name,
      variantName: r.variant_name,
      options: parseOrderOptions(r.options),
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
  search?: string,
): Promise<{ orders: Order[]; total: number }> {
  const from = (page - 1) * ORDERS_PAGE_SIZE
  const to = from + ORDERS_PAGE_SIZE - 1

  let query = supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .eq('shop_id', shopId)

  if (status) query = query.eq('status', status)
  if (search?.trim()) {
    const term = search.trim().replace(/[%,]/g, '')
    query = query.or(
      `customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%,order_number.ilike.%${term}%`,
    )
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error
  return { orders: (data ?? []) as Order[], total: count ?? 0 }
}

/** Toutes les commandes (filtrées par statut), articles compris, pour l'export tableur. Plafonné pour rester léger. */
export async function listOrdersForExport(
  shopId: string,
  status?: OrderStatus,
  limit = 5000,
): Promise<(Order & { items: { product_name: string; variant_name: string | null; quantity: number }[] })[]> {
  const pageSize = 500
  const rows: (Order & { items: { product_name: string; variant_name: string | null; quantity: number }[] })[] = []
  for (let from = 0; from < limit; from += pageSize) {
    let query = supabase
      .from('orders')
      .select('*, items:order_items(product_name, variant_name, quantity)')
      .eq('shop_id', shopId)
    if (status) query = query.eq('status', status)
    const { data, error } = await query.order('created_at', { ascending: false }).range(from, from + pageSize - 1)
    if (error) throw error
    const batch = (data ?? []) as typeof rows
    rows.push(...batch)
    if (batch.length < pageSize) break
  }
  return rows
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
  const order = data as Order
  void kickAutomations(order.shop_id)
  return order
}

/** Internal note, never shown to the customer. */
export async function updateOrderNotes(id: string, notes: string): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .update({ notes: notes.trim() || null })
    .eq('id', id)
    .select()
    .single()
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

/** Attaches the buyer's (optional) email to a just-placed order so it can
 *  later appear in their account history. Best-effort: throws never — the
 *  order itself is already safely stored. */
export async function setOrderCustomerEmail(orderId: string, email: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('set_order_customer_email', {
      p_order_id: orderId,
      p_email: email.trim(),
    })
    if (error) throw error
  } catch {
    // Non-blocking — email linking must never fail a completed purchase.
  }
}

/** The signed-in buyer's own orders on this shop (RLS self-read) with items. */
export async function listMyOrders(shopId: string): Promise<OrderWithItems[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as OrderWithItems[]
}

export { buildWhatsAppMessage, buildWhatsAppUrl } from '@/utils/whatsappMessage'
