import { supabase } from '@/lib/supabaseClient'
import type { ProfileRole } from '@/types'

export async function ensureProfile(
  userId: string,
  role: ProfileRole = 'owner',
  merchant: { firstName?: string; lastName?: string; phone?: string; address?: string; countryCode?: string; marketingOptIn?: boolean } = {},
): Promise<void> {
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    role,
    ...(merchant.countryCode?.trim() ? { country_code: merchant.countryCode.trim() } : {}),
    ...(merchant.firstName?.trim() ? { first_name: merchant.firstName.trim() } : {}),
    ...(merchant.lastName?.trim() ? { last_name: merchant.lastName.trim() } : {}),
    ...(merchant.phone?.trim() ? { phone: merchant.phone.trim() } : {}),
    ...(merchant.address?.trim() ? { address: merchant.address.trim() } : {}),
    ...(merchant.marketingOptIn ? { marketing_opt_in: true } : {}),
  })
  if (error) throw error
}

export async function getMarketingOptIn(userId: string): Promise<boolean> {
  const { data, error } = await supabase.from('profiles').select('marketing_opt_in').eq('id', userId).maybeSingle()
  if (error) throw error
  return data?.marketing_opt_in === true
}

export async function setMarketingOptIn(userId: string, optIn: boolean): Promise<void> {
  const { error } = await supabase.from('profiles').update({ marketing_opt_in: optIn }).eq('id', userId)
  if (error) throw error
}
