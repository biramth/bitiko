// Hand-written to match supabase/migrations/0001_init.sql.
// Once the Supabase project is live, regenerate with:
//   npx supabase gen types typescript --project-id <ref> > src/types/database.types.ts

export type OrderStatus = 'pending' | 'confirmed' | 'paid' | 'cancelled' | 'delivered'
export type ProfileRole = 'owner' | 'admin'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: ProfileRole
          created_at: string
        }
        Insert: {
          id: string
          role?: ProfileRole
          created_at?: string
        }
        Update: {
          id?: string
          role?: ProfileRole
          created_at?: string
        }
        Relationships: []
      }
      shops: {
        Row: {
          id: string
          owner_id: string
          name: string
          description: string | null
          logo_url: string | null
          whatsapp_number: string
          currency: string
          address: string | null
          social_links: Record<string, string> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          description?: string | null
          logo_url?: string | null
          whatsapp_number: string
          currency?: string
          address?: string | null
          social_links?: Record<string, string> | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          description?: string | null
          logo_url?: string | null
          whatsapp_number?: string
          currency?: string
          address?: string | null
          social_links?: Record<string, string> | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'shops_owner_id_fkey'
            columns: ['owner_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      categories: {
        Row: {
          id: string
          shop_id: string
          name: string
          slug: string
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          name: string
          slug: string
          created_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          name?: string
          slug?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'categories_shop_id_fkey'
            columns: ['shop_id']
            referencedRelation: 'shops'
            referencedColumns: ['id']
          },
        ]
      }
      products: {
        Row: {
          id: string
          shop_id: string
          category_id: string | null
          name: string
          slug: string
          description: string | null
          price: number
          stock: number
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          category_id?: string | null
          name: string
          slug: string
          description?: string | null
          price: number
          stock?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          category_id?: string | null
          name?: string
          slug?: string
          description?: string | null
          price?: number
          stock?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'products_shop_id_fkey'
            columns: ['shop_id']
            referencedRelation: 'shops'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'products_category_id_fkey'
            columns: ['category_id']
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
        ]
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          storage_path: string
          public_url: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          storage_path: string
          public_url: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          storage_path?: string
          public_url?: string
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'product_images_product_id_fkey'
            columns: ['product_id']
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      orders: {
        Row: {
          id: string
          shop_id: string
          order_number: string
          customer_name: string
          customer_phone: string
          total: number
          status: OrderStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          order_number: string
          customer_name: string
          customer_phone: string
          total: number
          status?: OrderStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          order_number?: string
          customer_name?: string
          customer_phone?: string
          total?: number
          status?: OrderStatus
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'orders_shop_id_fkey'
            columns: ['shop_id']
            referencedRelation: 'shops'
            referencedColumns: ['id']
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          unit_price: number
          quantity: number
          subtotal: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          unit_price: number
          quantity: number
          subtotal: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          unit_price?: number
          quantity?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: 'order_items_order_id_fkey'
            columns: ['order_id']
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_items_product_id_fkey'
            columns: ['product_id']
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      create_order: {
        Args: {
          p_shop_id: string
          p_customer_name: string
          p_customer_phone: string
          p_items: { product_id: string; quantity: number }[]
        }
        Returns: {
          order_id: string
          order_number: string
          total: number
          product_name: string
          unit_price: number
          quantity: number
          subtotal: number
        }[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
