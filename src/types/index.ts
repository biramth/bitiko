import type { Database, OrderStatus, ProfileRole } from './database.types'

export type Shop = Database['public']['Tables']['shops']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type ProductImage = Database['public']['Tables']['product_images']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type OrderItem = Database['public']['Tables']['order_items']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']

export type { OrderStatus, ProfileRole }

export interface ProductWithRelations extends Product {
  category: Category | null
  images: ProductImage[]
}

export interface CartItem {
  productId: string
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
