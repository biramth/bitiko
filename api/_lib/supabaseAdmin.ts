import { createClient } from '@supabase/supabase-js'

/**
 * Service-role client — bypasses RLS. Only ever used from these server
 * functions, never shipped to the browser. `shop_subscriptions`/`wave_payments`
 * deliberately carry no write policy for anon/authenticated, so this key is
 * the *only* way anything can write to them.
 */
export function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('Supabase service role is not configured on the server.')
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } })
}

/** Verifies the caller's Supabase access token and returns their user id, or null if invalid. */
export async function getUserIdFromAuthHeader(authHeader: string | undefined): Promise<string | null> {
  const token = authHeader?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) return null
  return data.user.id
}

/** Confirms the given user actually owns the given shop before we act on their behalf. */
export async function assertShopOwner(shopId: string, userId: string): Promise<boolean> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.from('shops').select('id').eq('id', shopId).eq('owner_id', userId).maybeSingle()
  if (error) throw error
  return !!data
}

/**
 * Platform-operator access (not a merchant's own admin dashboard) — gates
 * api/admin/*. A hardcoded allowlist rather than a database table/role: this
 * is a solo-operator tool today, and a plain array is one line to extend if
 * a co-admin ever joins, with no migration or RLS policy to get wrong.
 */
const PLATFORM_ADMIN_EMAILS = ['papebiramethiombanee@gmail.com']

export async function getPlatformAdminFromAuthHeader(
  authHeader: string | undefined,
): Promise<{ id: string; email: string } | null> {
  const token = authHeader?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user?.email) return null
  if (!PLATFORM_ADMIN_EMAILS.includes(data.user.email)) return null
  return { id: data.user.id, email: data.user.email }
}
