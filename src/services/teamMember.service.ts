import { supabase } from '@/lib/supabaseClient'
import type { Database } from '@/types/database.types'

export type TeamMemberRow = Database['public']['Tables']['team_members']['Row']

export type PublicTeamMember = Database['public']['Views']['team_members_public']['Row']

/** Équipe visible en vitrine — via la vue publique : les contacts n'y figurent
 *  que pour les équipiers dont le marchand a activé `show_contact`. */
export async function listActiveTeamMembers(shopId: string): Promise<PublicTeamMember[]> {
  const { data, error } = await supabase
    .from('team_members_public')
    .select('*')
    .eq('shop_id', shopId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** Toute l'équipe (backoffice, actifs + inactifs). */
export async function listShopTeamMembers(shopId: string): Promise<TeamMemberRow[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('shop_id', shopId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export type TeamMemberInput = Pick<
  TeamMemberRow,
  'shop_id' | 'name' | 'role' | 'specialty' | 'phone' | 'email' | 'avatar_url' | 'active' | 'show_contact'
>

export async function createTeamMember(input: TeamMemberInput): Promise<TeamMemberRow> {
  const { data, error } = await supabase.from('team_members').insert(input).select().single()
  if (error) throw error
  return data
}

export async function updateTeamMember(id: string, updates: Partial<TeamMemberInput>): Promise<TeamMemberRow> {
  const { data, error } = await supabase.from('team_members').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteTeamMember(id: string): Promise<void> {
  const { error } = await supabase.from('team_members').delete().eq('id', id)
  if (error) throw error
}
