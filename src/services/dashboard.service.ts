import { supabase } from '@/lib/supabaseClient'
import type { Order, OrderStatus } from '@/types'

export interface DashboardStats {
  totalProducts: number
  activeProducts: number
  outOfStockProducts: number
  lowStockProducts: number
  totalOrders: number
  pendingOrders: number
  ordersToday: number
  revenueToday: number
  salesTotal: number
  recentOrders: Order[]
}

async function countProducts(
  shopId: string,
  filter?: { active?: boolean; stock?: number; stockLte?: number },
) {
  let query = supabase.from('products').select('*', { count: 'exact', head: true }).eq('shop_id', shopId)
  if (filter?.active !== undefined) query = query.eq('active', filter.active)
  if (filter?.stock !== undefined) query = query.eq('stock', filter.stock)
  if (filter?.stockLte !== undefined) query = query.lte('stock', filter.stockLte)
  const { count: total, error } = await query
  if (error) throw error
  return total ?? 0
}

async function countOrders(shopId: string, filter?: { status?: OrderStatus }) {
  let query = supabase.from('orders').select('*', { count: 'exact', head: true }).eq('shop_id', shopId)
  if (filter?.status !== undefined) query = query.eq('status', filter.status)
  const { count: total, error } = await query
  if (error) throw error
  return total ?? 0
}

export async function getDashboardStats(
  shopId: string,
  lowStockThreshold = 5,
): Promise<DashboardStats> {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const [
    totalProducts,
    activeProducts,
    outOfStockProducts,
    lowStockProducts,
    totalOrders,
    pendingOrders,
    ordersToday,
    revenueToday,
    sales,
    recentOrders,
  ] = await Promise.all([
    countProducts(shopId),
    countProducts(shopId, { active: true }),
    countProducts(shopId, { stock: 0 }),
    countProducts(shopId, { stockLte: lowStockThreshold }),
    countOrders(shopId),
    countOrders(shopId, { status: 'pending' }),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('shop_id', shopId)
      .gte('created_at', startOfToday.toISOString()),
    supabase
      .from('orders')
      .select('total')
      .eq('shop_id', shopId)
      .gte('created_at', startOfToday.toISOString())
      .neq('status', 'cancelled'),
    supabase.from('orders').select('total').eq('shop_id', shopId).neq('status', 'cancelled'),
    supabase
      .from('orders')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  if (revenueToday.error) throw revenueToday.error
  if (sales.error) throw sales.error
  if (recentOrders.error) throw recentOrders.error

  const revenueTodayTotal = revenueToday.data.reduce((sum, o) => sum + Number(o.total), 0)
  const salesTotal = sales.data.reduce((sum, o) => sum + Number(o.total), 0)

  return {
    totalProducts,
    activeProducts,
    outOfStockProducts,
    lowStockProducts,
    totalOrders,
    pendingOrders,
    ordersToday: ordersToday.count ?? 0,
    revenueToday: revenueTodayTotal,
    salesTotal,
    recentOrders: (recentOrders.data ?? []) as Order[],
  }
}
