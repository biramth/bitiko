import { supabase } from '@/lib/supabaseClient'
import type { PlatformRole } from '@/features/platform/permissions'

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

// ---------------------------------------------------------------------------
// Platform membership, team & campaigns (migration 0048 / 0049). The role is
// resolved server-side; the browser only reflects it.
// ---------------------------------------------------------------------------

/** The signed-in user's platform role, or null if they aren't a platform member. */
export async function getMyPlatformRole(): Promise<PlatformRole | null> {
  const { data, error } = await supabase.rpc('get_platform_role')
  if (error) throw new Error(error.message)
  return (data as PlatformRole | null) ?? null
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Non authentifié.')
  return { Authorization: `Bearer ${token}` }
}

async function platformFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...(await authHeader()), ...init?.headers },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((body as { error?: string }).error ?? 'Erreur inattendue.')
  return body as T
}

export interface PlatformMemberRow {
  userId: string
  email: string | null
  role: PlatformRole
  createdAt: string
  isSelf: boolean
}

export function listPlatformMembers(): Promise<{ members: PlatformMemberRow[]; canManageOwners: boolean }> {
  return platformFetch('/api/admin/team')
}

export function addPlatformMember(email: string, role: PlatformRole): Promise<{ ok: true }> {
  return platformFetch('/api/admin/team/add', { method: 'POST', body: JSON.stringify({ email, role }) })
}

export function updatePlatformMember(userId: string, role: PlatformRole): Promise<{ ok: true }> {
  return platformFetch('/api/admin/team/update', { method: 'POST', body: JSON.stringify({ userId, role }) })
}

export function removePlatformMember(userId: string): Promise<{ ok: true }> {
  return platformFetch('/api/admin/team/remove', { method: 'POST', body: JSON.stringify({ userId }) })
}

export interface CampaignAudience {
  vibe?: 'any' | 'missing' | 'set'
  plan?: 'any' | 'free' | 'paid' | 'essential' | 'pro'
  logo?: 'any' | 'has' | 'none'
  products?: 'any' | 'has' | 'none'
  created_within_days?: number | null
}

export interface CampaignRow {
  id: string
  name: string
  subject: string
  body: string
  audience: CampaignAudience
  status: 'draft' | 'sending' | 'sent'
  created_at: string
  sent_at: string | null
  recipient_count: number
  sent_count: number
  failed_count: number
}

export interface CampaignAudiencePreview {
  count: number
  withEmail: number
  sample: { name: string; slug: string; plan: string; vibe: string | null }[]
}

export interface CampaignInput {
  id?: string
  name: string
  subject: string
  body: string
  audience: CampaignAudience
}

export async function listCampaigns(): Promise<CampaignRow[]> {
  const { campaigns } = await platformFetch<{ campaigns: CampaignRow[] }>('/api/admin/campaigns')
  return campaigns
}

export function saveCampaign(input: CampaignInput): Promise<{ id: string }> {
  return platformFetch('/api/admin/campaigns/save', { method: 'POST', body: JSON.stringify(input) })
}

export function previewCampaignAudience(audience: CampaignAudience): Promise<CampaignAudiencePreview> {
  return platformFetch('/api/admin/campaigns/audience', { method: 'POST', body: JSON.stringify({ audience }) })
}

export function sendCampaign(id: string): Promise<{ recipientCount: number; sent: number; failed: number }> {
  return platformFetch('/api/admin/campaigns/send', { method: 'POST', body: JSON.stringify({ id }) })
}
