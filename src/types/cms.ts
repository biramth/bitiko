import type { Database } from './database.types'

export type ShopPromo = Database['public']['Tables']['shop_promos']['Row']
export type ShopPromoInsert = Database['public']['Tables']['shop_promos']['Insert']
export type ShopPromoUpdate = Database['public']['Tables']['shop_promos']['Update']
export type ShopTestimonial = Database['public']['Tables']['shop_testimonials']['Row']
export type ShopTestimonialInsert = Database['public']['Tables']['shop_testimonials']['Insert']
export type ShopTestimonialUpdate = Database['public']['Tables']['shop_testimonials']['Update']
export type ShopFaq = Database['public']['Tables']['shop_faqs']['Row']
export type ShopFaqInsert = Database['public']['Tables']['shop_faqs']['Insert']
export type ShopFaqUpdate = Database['public']['Tables']['shop_faqs']['Update']
export type ShopSocialPost = Database['public']['Tables']['shop_social_posts']['Row']
export type ShopSocialPostInsert = Database['public']['Tables']['shop_social_posts']['Insert']
export type ShopSocialPostUpdate = Database['public']['Tables']['shop_social_posts']['Update']

export type ShopPromoScope = 'site' | 'product' | 'category' | 'service'

export const PROMO_SCOPES: { value: ShopPromoScope; label: string; hint: string }[] = [
  { value: 'site', label: 'Tout le site', hint: 'Bandeau et pastille génériques (ex : soldes, livraison offerte).' },
  { value: 'product', label: 'Un produit', hint: 'Pastille sur la fiche et la carte du produit visé.' },
  { value: 'category', label: 'Une catégorie', hint: 'Pastille sur tous les produits et prestations de la catégorie.' },
  { value: 'service', label: 'Une prestation', hint: 'Pastille sur la carte de la prestation visée.' },
]

export type CmsTableName = 'shop_promos' | 'shop_testimonials' | 'shop_faqs' | 'shop_social_posts'
