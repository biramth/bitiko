import { supabase } from '@/lib/supabaseClient'
import type { Country, Currency } from '@/types'

/** Countries merchants may actually choose — `is_enabled` is the super-admin's
 *  decision (platform workspace "Pays" tool), never the merchant's. */
export async function listEnabledCountries(): Promise<Country[]> {
  const { data, error } = await supabase
    .from('countries')
    .select('*')
    .eq('is_enabled', true)
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

/** Every country, enabled or not — for the platform super-admin "Pays" tool. */
export async function listCountries(): Promise<Country[]> {
  const { data, error } = await supabase
    .from('countries')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

export async function listCurrencies(): Promise<Currency[]> {
  const { data, error } = await supabase
    .from('currencies')
    .select('*')
    .order('code', { ascending: true })
  if (error) throw error
  return data
}