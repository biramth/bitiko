import { supabase } from '@/lib/supabaseClient'
import type { PublishHistoryEntry } from '@/types/publishHistory'
import type { LayoutSection, SystemTemplateKey, ThemeConfig } from '@/types/builder'

export interface PublishSnapshot {
  themeColor: string
  themeConfig: ThemeConfig
  sections: LayoutSection[]
  templates: Partial<Record<SystemTemplateKey, LayoutSection[]>>
}

export async function listPublishHistory(shopId: string): Promise<PublishHistoryEntry[]> {
  const { data, error } = await supabase
    .from('shop_publish_history')
    .select('*')
    .eq('shop_id', shopId)
    .order('published_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as PublishHistoryEntry[]
}

/** Archives the outgoing published design right before it's overwritten by
 *  a new "Publier" — see `publishStore` in StoreBuilderPage.tsx, which calls
 *  this best-effort (never blocks the actual publish on it). */
export async function archivePublishedSnapshot(shopId: string, snapshot: PublishSnapshot): Promise<void> {
  const { error } = await supabase.from('shop_publish_history').insert({
    shop_id: shopId,
    theme_color: snapshot.themeColor,
    theme_config: snapshot.themeConfig,
    sections: snapshot.sections,
    templates: snapshot.templates,
  })
  if (error) throw error
}
