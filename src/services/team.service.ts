import { supabase } from '@/lib/supabaseClient'
import type { Database } from '@/types/database.types'

export type ShopMember = Database['public']['Tables']['shop_members']['Row']
export type ShopMemberRole = 'manager' | 'vendeur'

export const SHOP_MEMBER_ROLE_LABELS: Record<ShopMemberRole, string> = {
  manager: 'Manager',
  vendeur: 'Vendeur',
}

/** Members + pending invites of a shop (owner reads via RLS). */
export async function listShopMembers(shopId: string): Promise<ShopMember[]> {
  const { data, error } = await supabase
    .from('shop_members')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** Invite by email — the invitee claims it on next login (claim RPC), so
 *  they don't need an account yet. Idempotent per (shop, email). */
export async function inviteShopMember(shopId: string, email: string, role: ShopMemberRole): Promise<ShopMember> {
  const { data, error } = await supabase
    .from('shop_members')
    .upsert({ shop_id: shopId, email: email.trim().toLowerCase(), role }, { onConflict: 'shop_id,email' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function setShopMemberRole(id: string, role: ShopMemberRole): Promise<void> {
  const { error } = await supabase.from('shop_members').update({ role }).eq('id', id)
  if (error) throw error
}

export async function removeShopMember(id: string): Promise<void> {
  const { error } = await supabase.from('shop_members').delete().eq('id', id)
  if (error) throw error
}

/** Called once per admin session: links pending invites sent to the
 *  signed-in user's email to their account. Idempotent. */
export async function claimShopInvites(): Promise<string[]> {
  const { data, error } = await supabase.rpc('claim_shop_invites')
  if (error) throw error
  return (data ?? []) as string[]
}

export type ShopRole = 'owner' | ShopMemberRole

/** The caller's role on a shop (null when signed out). Owner is derived
 *  from the shop row itself; staff from their claimed membership. */
export async function getMyShopRole(
  shop: { id: string; owner_id: string } | null | undefined,
  userId: string | undefined,
): Promise<ShopRole | null> {
  if (!shop || !userId) return null
  if (shop.owner_id === userId) return 'owner'
  const { data, error } = await supabase
    .from('shop_members')
    .select('role')
    .eq('shop_id', shop.id)
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return null
  return data.role === 'manager' ? 'manager' : 'vendeur'
}
