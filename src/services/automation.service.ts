import { supabase } from '@/lib/supabaseClient'
import type { Database } from '@/types/database.types'

export type AutomationRuleRow = Database['public']['Tables']['automation_rules']['Row']

export async function listAutomationRules(shopId: string): Promise<AutomationRuleRow[]> {
  const { data, error } = await supabase.from('automation_rules').select('*').eq('shop_id', shopId)
  if (error) throw error
  return data ?? []
}

/** Crée ou met à jour la règle email d'un événement (une par boutique, événement et canal). */
export async function saveEmailRule(input: {
  shopId: string
  eventType: string
  enabled: boolean
  subject: string
  body: string
}): Promise<void> {
  const { error } = await supabase.from('automation_rules').upsert(
    {
      shop_id: input.shopId,
      event_type: input.eventType,
      channel: 'email',
      enabled: input.enabled,
      template: { subject: input.subject.trim(), body: input.body.trim() },
    },
    { onConflict: 'shop_id,event_type,channel' },
  )
  if (error) throw error
}
