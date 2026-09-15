import { supabase } from '@/lib/supabaseClient'
import type { StorePage } from '@/types/pages'
import type { LayoutSection } from '@/types/builder'

export async function listShopPages(shopId: string): Promise<StorePage[]> {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as StorePage[]
}

export async function getShopPageById(pageId: string): Promise<StorePage | null> {
  const { data, error } = await supabase.from('pages').select('*').eq('id', pageId).maybeSingle()
  if (error) throw error
  return data as StorePage | null
}

export async function getPublishedPageBySlug(shopId: string, slug: string): Promise<StorePage | null> {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('shop_id', shopId)
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle()
  if (error) throw error
  return data as StorePage | null
}

/** Like `getPublishedPageBySlug` but ignores publish state — used by the
 *  builder's "Prévisualiser" preview tab, which must show an unpublished
 *  page's draft rather than reporting it as not found. */
export async function getPageBySlug(shopId: string, slug: string): Promise<StorePage | null> {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('shop_id', shopId)
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return data as StorePage | null
}

export async function createPage(shopId: string, title: string, slug: string): Promise<StorePage> {
  const { data, error } = await supabase
    .from('pages')
    .insert({
      shop_id: shopId,
      title,
      slug,
      content: [] as LayoutSection[],
      is_published: false,
    })
    .select()
    .single()
  if (error) throw error
  return data as StorePage
}

export async function updatePage(
  pageId: string,
  updates: Partial<Pick<StorePage, 'title' | 'slug' | 'seo_title' | 'seo_description' | 'is_published' | 'content' | 'draft_content'>>,
): Promise<StorePage> {
  const { data, error } = await supabase
    .from('pages')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', pageId)
    .select()
    .single()
  if (error) throw error
  return data as StorePage
}

export async function deletePage(pageId: string): Promise<void> {
  const { error } = await supabase.from('pages').delete().eq('id', pageId)
  if (error) throw error
}

/** Publish: move draft content → live, mark published. */
export async function publishPage(pageId: string, sections: LayoutSection[]): Promise<StorePage> {
  return updatePage(pageId, { content: sections, draft_content: null, is_published: true })
}

/** Unpublish: take the page offline, keep content as draft for next edit. */
export async function unpublishPage(pageId: string): Promise<StorePage> {
  return updatePage(pageId, { is_published: false })
}

/** Save a working copy without making it live. */
export async function savePageDraft(pageId: string, sections: LayoutSection[]): Promise<StorePage> {
  return updatePage(pageId, { draft_content: sections })
}