import { supabase } from '@/lib/supabaseClient'
import type { ProfileRole } from '@/types'

export async function ensureProfile(
  userId: string,
  role: ProfileRole = 'owner',
  merchant: { firstName?: string; lastName?: string; phone?: string; address?: string } = {},
): Promise<void> {
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    role,
    ...(merchant.firstName?.trim() ? { first_name: merchant.firstName.trim() } : {}),
    ...(merchant.lastName?.trim() ? { last_name: merchant.lastName.trim() } : {}),
    ...(merchant.phone?.trim() ? { phone: merchant.phone.trim() } : {}),
    ...(merchant.address?.trim() ? { address: merchant.address.trim() } : {}),
  })
  if (error) throw error
}
