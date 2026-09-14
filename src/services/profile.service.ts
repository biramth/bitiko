import { supabase } from '@/lib/supabaseClient'
import type { ProfileRole } from '@/types'

export async function ensureProfile(userId: string, role: ProfileRole = 'owner'): Promise<void> {
  const { error } = await supabase.from('profiles').upsert({ id: userId, role })
  if (error) throw error
}
