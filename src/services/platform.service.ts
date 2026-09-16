import { supabase } from '@/lib/supabaseClient'

/**
 * Platform-operator data (see supabase/migrations/0033_platform_analytics.sql).
 * Every RPC below is SECURITY DEFINER and rejects callers outside the operator
 * allowlist with "Accès réservé.", so a non-admin simply gets an error here —
 * nothing sensitive is ever returned to the browser.
 */

export interface PlatformRevenue {
  currency: string
  total: number
}

export interface PlatformVisitsByDay {
  day: string
  visits: number
  visitors: number
}

export interface PlatformStats {
  total_shops: number
  paid_shops: number
  total_products: number
  active_products: number
  total_orders: number
  orders_today: number
  revenue_by_currency: PlatformRevenue[]
  revenue_today_by_currency: PlatformRevenue[]
  visits_today: number
  visitors_today: number
  visits_7d: number
  visitors_7d: number
  visits_30d: number
  visitors_30d: number
  visits_by_day: PlatformVisitsByDay[] | null
  top_pages: { shop: string; path: string; visits: number }[] | null
  top_shops: { slug: string; name: string; visits: number }[] | null
  top_referrers: { referrer: string; visits: number }[] | null
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const { data, error } = await supabase.rpc('get_platform_stats')
  if (error) throw new Error(error.message)
  return data as unknown as PlatformStats
}

export interface PlatformShop {
  id: string
  name: string
  slug: string
  whatsapp_number: string | null
  currency: string
  created_at: string
  products: number
  orders: number
  revenue: number
  plan: string
  plan_status: string
}

export async function getPlatformShops(): Promise<PlatformShop[]> {
  const { data, error } = await supabase.rpc('get_platform_shops')
  if (error) throw new Error(error.message)
  return data ?? []
}

export interface PlatformOrder {
  id: string
  order_number: string
  shop_id: string
  shop_name: string
  shop_slug: string
  customer_name: string
  customer_phone: string
  total: number
  status: string
  created_at: string
}

export async function getPlatformOrders(limit = 25): Promise<PlatformOrder[]> {
  const { data, error } = await supabase.rpc('get_platform_orders', { p_limit: limit })
  if (error) throw new Error(error.message)
  return data ?? []
}
