import { supabase } from '@/lib/supabaseClient'
import type {
  ShopFaq,
  ShopFaqInsert,
  ShopFaqUpdate,
  ShopPromo,
  ShopPromoInsert,
  ShopPromoUpdate,
  ShopSocialPost,
  ShopSocialPostInsert,
  ShopSocialPostUpdate,
  ShopTestimonial,
  ShopTestimonialInsert,
  ShopTestimonialUpdate,
} from '@/types/cms'
import type { CmsTableName } from '@/types/cms'

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
type AnyQuery = any

function tableQuery(table: CmsTableName): AnyQuery {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase.from as any)(table)
}

/** CRUD générique des collections CMS (promos, avis, FAQ, posts sociaux) :
 *  lignes de la boutique, triées (ordre manuel puis création). `listActive`
 *  sert la vitrine publique (RLS : lignes actives lisibles par tous). Les
 *  casts vivent ici, à la frontière base — les appelants restent typés. */
function cmsCollection<TRow, TInsert, TUpdate>(table: CmsTableName) {
  const ordered = () => tableQuery(table).select('*').order('sort_order').order('created_at')

  return {
    async list(shopId: string): Promise<TRow[]> {
      const { data, error } = await ordered().eq('shop_id', shopId)
      if (error) throw error
      return (data ?? []) as TRow[]
    },

    async listActive(shopId: string): Promise<TRow[]> {
      const { data, error } = await ordered().eq('shop_id', shopId).eq('is_active', true)
      if (error) throw error
      return (data ?? []) as TRow[]
    },

    async create(shopId: string, values: TInsert): Promise<TRow> {
      const { data, error } = await tableQuery(table)
        .insert({ ...(values as Record<string, unknown>), shop_id: shopId })
        .select('*')
        .single()
      if (error) throw error
      return data as TRow
    },

    async update(id: string, patch: TUpdate): Promise<void> {
      const { error } = await tableQuery(table).update(patch).eq('id', id)
      if (error) throw error
    },

    async remove(id: string): Promise<void> {
      const { error } = await tableQuery(table).delete().eq('id', id)
      if (error) throw error
    },

    async reorder(orderedIds: string[]): Promise<void> {
      for (const [index, id] of orderedIds.entries()) {
        const { error } = await tableQuery(table).update({ sort_order: index }).eq('id', id)
        if (error) throw error
      }
    },
  }
}

type PromoCollection = ReturnType<typeof cmsCollection<ShopPromo, ShopPromoInsert, ShopPromoUpdate>>
type TestimonialCollection = ReturnType<typeof cmsCollection<ShopTestimonial, ShopTestimonialInsert, ShopTestimonialUpdate>>
type FaqCollection = ReturnType<typeof cmsCollection<ShopFaq, ShopFaqInsert, ShopFaqUpdate>>
type SocialPostCollection = ReturnType<typeof cmsCollection<ShopSocialPost, ShopSocialPostInsert, ShopSocialPostUpdate>>

export const promosCollection: PromoCollection = cmsCollection('shop_promos')
export const testimonialsCollection: TestimonialCollection = cmsCollection('shop_testimonials')
export const faqsCollection: FaqCollection = cmsCollection('shop_faqs')
export const socialPostsCollection: SocialPostCollection = cmsCollection('shop_social_posts')
