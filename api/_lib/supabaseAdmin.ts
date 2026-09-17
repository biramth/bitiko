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
 * Platform-operator access, now backed by the platform_members table
 * (migration 0048) instead of a hardcoded email allowlist — so the SaaS team
 * can hold real accounts with distinct scopes instead of a single super-admin.
 * Roles:
 *   owner     — full platform control, including managing who owns the platform
 *   admin     — full platform control except owners themselves
 *   dev       — same as admin minus team management
 *   marketing — analytics + shops + campaigns only, no payments, no team
 */
export type PlatformRole = 'owner' | 'admin' | 'dev' | 'marketing'

export interface PlatformMember {
  id: string
  email: string
  role: PlatformRole
}

const MANAGE_TEAM_ROLES: PlatformRole[] = ['owner', 'admin']
const MANAGE_PAYMENTS_ROLES: PlatformRole[] = ['owner', 'admin', 'dev']

export function canManageTeam(role: PlatformRole): boolean {
  return MANAGE_TEAM_ROLES.includes(role)
}

export function canManagePayments(role: PlatformRole): boolean {
  return MANAGE_PAYMENTS_ROLES.includes(role)
}

/**
 * Resolves the authenticated caller's platform membership (if any). The role
 * comes from the database, never from the request, so a member cannot
 * self-promote by tweaking a header.
 */
export async function getPlatformMemberFromAuthHeader(
  authHeader: string | undefined,
): Promise<PlatformMember | null> {
  const token = authHeader?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const admin = getSupabaseAdmin()
  const { data: user, error } = await admin.auth.getUser(token)
  if (error || !user.user) return null
  const { data: member, error: memberError } = await admin
    .from('platform_members')
    .select('role')
    .eq('user_id', user.user.id)
    .maybeSingle()
  if (memberError || !member) return null
  return { id: user.user.id, email: user.user.email ?? '', role: member.role as PlatformRole }
}

/** Membership restricted to the roles allowed to act on money (payments, plans). */
export async function getPlatformOperatorFromAuthHeader(
  authHeader: string | undefined,
): Promise<PlatformMember | null> {
  const member = await getPlatformMemberFromAuthHeader(authHeader)
  if (!member || !canManagePayments(member.role)) return null
  return member
}

/** Backwards-compatible alias used by the pre-0048 endpoints. */
export const getPlatformAdminFromAuthHeader = getPlatformMemberFromAuthHeader
