import { supabase } from '@/lib/supabaseClient'
import type { Order, OrderStatus } from '@/types'

export interface DashboardStats {
  totalProducts: number
  activeProducts: number
  outOfStockProducts: number
  totalOrders: number
  pendingOrders: number
  paidOrdersRevenue: number
  recentOrders: Order[]
}

async function countProducts(shopId: string, filter?: { active?: boolean; stock?: number }) {
  let query = supabase.from('products').select('*', { count: 'exact', head: true }).eq('shop_id', shopId)
  if (filter?.active !== undefined) query = query.eq('active', filter.active)
  if (filter?.stock !== undefined) query = query.eq('stock', filter.stock)
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

export async function getDashboardStats(shopId: string): Promise<DashboardStats> {
  const [totalProducts, activeProducts, outOfStockProducts, totalOrders, pendingOrders, paidOrders, recentOrders] =
    await Promise.all([
      countProducts(shopId),
      countProducts(shopId, { active: true }),
      countProducts(shopId, { stock: 0 }),
      countOrders(shopId),
      countOrders(shopId, { status: 'pending' }),
      supabase.from('orders').select('total').eq('shop_id', shopId).eq('status', 'paid'),
      supabase
        .from('orders')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

  if (paidOrders.error) throw paidOrders.error
  if (recentOrders.error) throw recentOrders.error

  const paidOrdersRevenue = paidOrders.data.reduce((sum, o) => sum + Number(o.total), 0)

  return {
    totalProducts,
    activeProducts,
    outOfStockProducts,
    totalOrders,
    pendingOrders,
    paidOrdersRevenue,
    recentOrders: recentOrders.data ?? [],
  }
}
