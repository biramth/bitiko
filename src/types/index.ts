import type { Database } from './database.types'

// Plain check-constrained text columns, not real Postgres enums, so the
// generated database.types.ts doesn't export these — declared here instead
// so they survive a `supabase gen types` regeneration.
export type OrderStatus = 'pending' | 'confirmed' | 'paid' | 'cancelled' | 'delivered'
export type PaymentMethod = 'cod' | 'mobile_money'
export type ProfileRole = 'owner' | 'admin'

export type Shop = Database['public']['Tables']['shops']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type ProductImage = Database['public']['Tables']['product_images']['Row']
export type ProductVariant = Database['public']['Tables']['product_variants']['Row']
export type DeliverySecteur = Database['public']['Tables']['delivery_secteurs']['Row']
export type DeliveryVille = Database['public']['Tables']['delivery_villes']['Row']
export { type StorePage } from './pages'
// `status` is a plain `text` column with a check constraint, not a real
// Postgres enum, so the generated Row type only knows it's a string —
// narrowed here to the actual set of values the app ever writes/reads.
export type Order = Omit<Database['public']['Tables']['orders']['Row'], 'status'> & { status: OrderStatus }
export type OrderItem = Database['public']['Tables']['order_items']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']

export interface ProductWithRelations extends Product {
  category: Category | null
  images: ProductImage[]
  variants: ProductVariant[]
}

/** A field the merchant adds to a product for the customer to fill in before
 *  ordering (no price, no stock — variants handle those). */
export type OptionFieldType = 'choice' | 'text'

export interface OptionField {
  id: string
  label: string
  type: OptionFieldType
  required: boolean
  /** Listed answers, for `choice` fields (empty for `text`). */
  choices: string[]
}

/** What the customer picked for one option field. */
export interface SelectedOption {
  fieldId: string
  label: string
  value: string
}

export interface CartItem {
  productId: string
  variantId?: string
  variantName?: string
  options?: SelectedOption[]
  name: string
  slug: string
  price: number
  quantity: number
  imageUrl: string | null
  stock: number
}

export interface OrderWithItems extends Order {
  items: OrderItem[]
}

export type TenantContext =
  | { type: 'platform' }
  | { type: 'shop'; slug: string }
