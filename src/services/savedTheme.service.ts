import { supabase } from '@/lib/supabaseClient'
import type { SavedTheme } from '@/types/savedTheme'
import type { LayoutSection, SystemTemplateKey, ThemeConfig } from '@/types/builder'

export interface SavedThemeSnapshot {
  themeColor: string
  themeConfig: ThemeConfig
  sections: LayoutSection[]
  templates: Partial<Record<SystemTemplateKey, LayoutSection[]>>
}

export async function listSavedThemes(shopId: string): Promise<SavedTheme[]> {
  const { data, error } = await supabase
    .from('shop_saved_themes')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as SavedTheme[]
}

export async function createSavedTheme(shopId: string, name: string, snapshot: SavedThemeSnapshot): Promise<SavedTheme> {
  const { data, error } = await supabase
    .from('shop_saved_themes')
    .insert({
      shop_id: shopId,
      name,
      theme_color: snapshot.themeColor,
      theme_config: snapshot.themeConfig,
      sections: snapshot.sections,
      templates: snapshot.templates,
    })
    .select()
    .single()
  if (error) throw error
  return data as SavedTheme
}

export async function duplicateSavedTheme(theme: SavedTheme): Promise<SavedTheme> {
  return createSavedTheme(theme.shop_id, `${theme.name} (copie)`, {
    themeColor: theme.theme_color,
    themeConfig: theme.theme_config,
    sections: theme.sections,
    templates: theme.templates,
  })
}

export async function renameSavedTheme(id: string, name: string): Promise<SavedTheme> {
  const { data, error } = await supabase
    .from('shop_saved_themes')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as SavedTheme
}

export async function deleteSavedTheme(id: string): Promise<void> {
  const { error } = await supabase.from('shop_saved_themes').delete().eq('id', id)
  if (error) throw error
}
