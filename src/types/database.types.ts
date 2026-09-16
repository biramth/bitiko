import type { BuilderDraft, LayoutSection, SystemTemplateMap, ThemeConfig } from './builder.js'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          emoji: string | null
          id: string
          image_url: string | null
          name: string
          position: number
          shop_id: string
          slug: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          image_url?: string | null
          name: string
          position?: number
          shop_id: string
          slug: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          image_url?: string | null
          name?: string
          position?: number
          shop_id?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_secteurs: {
        Row: {
          created_at: string
          fee: number
          id: string
          is_active: boolean
          name: string
          shop_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fee?: number
          id?: string
          is_active?: boolean
          name: string
          shop_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fee?: number
          id?: string
          is_active?: boolean
          name?: string
          shop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_secteurs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_villes: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          secteur_id: string
          shop_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          secteur_id: string
          shop_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          secteur_id?: string
          shop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_villes_secteur_id_fkey"
            columns: ["secteur_id"]
            isOneToOne: false
            referencedRelation: "delivery_secteurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_villes_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          subtotal: number
          unit_price: number
          variant_id: string | null
          variant_name: string | null
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          subtotal: number
          unit_price: number
          variant_id?: string | null
          variant_name?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          subtotal?: number
          unit_price?: number
          variant_id?: string | null
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_address: string | null
          customer_name: string
          customer_phone: string
          delivery_fee: number
          delivery_zone_name: string | null
          id: string
          notes: string | null
          order_number: string
          payment_method: string
          shop_id: string
          status: string
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_address?: string | null
          customer_name: string
          customer_phone: string
          delivery_fee?: number
          delivery_zone_name?: string | null
          id?: string
          notes?: string | null
          order_number: string
          payment_method?: string
          shop_id: string
          status?: string
          total: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_address?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_fee?: number
          delivery_zone_name?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: string
          shop_id?: string
          status?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          content: LayoutSection[]
          created_at: string
          draft_content: LayoutSection[] | null
          id: string
          is_published: boolean
          seo_description: string | null
          seo_title: string | null
          shop_id: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: LayoutSection[]
          created_at?: string
          draft_content?: LayoutSection[] | null
          id?: string
          is_published?: boolean
          seo_description?: string | null
          seo_title?: string | null
          shop_id: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: LayoutSection[]
          created_at?: string
          draft_content?: LayoutSection[] | null
          id?: string
          is_published?: boolean
          seo_description?: string | null
          seo_title?: string | null
          shop_id?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          product_id: string
          public_url: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          public_url: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          public_url?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          price: number | null
          product_id: string
          sku: string | null
          sort_order: number
          stock: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          price?: number | null
          product_id: string
          sku?: string | null
          sort_order?: number
          stock?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          price?: number | null
          product_id?: string
          sku?: string | null
          sort_order?: number
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          price: number
          shop_id: string
          slug: string
          stock: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price: number
          shop_id: string
          slug: string
          stock?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price?: number
          shop_id?: string
          slug?: string
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          role?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: string
        }
        Relationships: []
      }
      shop_subscriptions: {
        Row: {
          current_period_end: string | null
          plan: string
          shop_id: string
          status: string
          updated_at: string
        }
        Insert: {
          current_period_end?: string | null
          plan?: string
          shop_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          current_period_end?: string | null
          plan?: string
          shop_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_subscriptions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          address: string | null
          banner_url: string | null
          builder_draft: BuilderDraft | null
          created_at: string
          currency: string
          delivery_fee: number
          description: string | null
          free_delivery_threshold: number | null
          id: string
          layout_sections: LayoutSection[]
          logo_url: string | null
          low_stock_threshold: number
          name: string
          owner_id: string
          page_templates: SystemTemplateMap
          payment_instructions: string | null
          slug: string
          social_links: Record<string, string>
          template_id: string | null
          theme_color: string
          theme_config: ThemeConfig
          updated_at: string
          whatsapp_number: string
        }
        Insert: {
          address?: string | null
          banner_url?: string | null
          builder_draft?: BuilderDraft | null
          created_at?: string
          currency?: string
          delivery_fee?: number
          description?: string | null
          free_delivery_threshold?: number | null
          id?: string
          layout_sections?: LayoutSection[]
          logo_url?: string | null
          low_stock_threshold?: number
          name: string
          owner_id: string
          page_templates?: SystemTemplateMap
          payment_instructions?: string | null
          slug: string
          social_links?: Record<string, string>
          template_id?: string | null
          theme_color?: string
          theme_config?: ThemeConfig
          updated_at?: string
          whatsapp_number: string
        }
        Update: {
          address?: string | null
          banner_url?: string | null
          builder_draft?: BuilderDraft | null
          created_at?: string
          currency?: string
          delivery_fee?: number
          description?: string | null
          free_delivery_threshold?: number | null
          id?: string
          layout_sections?: LayoutSection[]
          logo_url?: string | null
          low_stock_threshold?: number
          name?: string
          owner_id?: string
          page_templates?: SystemTemplateMap
          payment_instructions?: string | null
          slug?: string
          social_links?: Record<string, string>
          template_id?: string | null
          theme_color?: string
          theme_config?: ThemeConfig
          updated_at?: string
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "shops_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wave_payments: {
        Row: {
          amount: number
          client_reference: string
          completed_at: string | null
          created_at: string
          currency: string
          id: string
          plan: string
          shop_id: string
          status: string
          wave_checkout_id: string | null
          wave_transaction_id: string | null
        }
        Insert: {
          amount: number
          client_reference: string
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          plan: string
          shop_id: string
          status?: string
          wave_checkout_id?: string | null
          wave_transaction_id?: string | null
        }
        Update: {
          amount?: number
          client_reference?: string
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          plan?: string
          shop_id?: string
          status?: string
          wave_checkout_id?: string | null
          wave_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wave_payments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_order: {
        Args: {
          p_customer_address: string
          p_customer_name: string
          p_customer_phone: string
          p_delivery_fee?: number
          p_delivery_zone_name?: string
          p_items: Json
          p_payment_method?: string
          p_shop_id: string
        }
        Returns: {
          order_id: string
          order_number: string
          product_name: string
          quantity: number
          subtotal: number
          total: number
          unit_price: number
        }[]
      }
      seed_default_delivery_secteurs: {
        Args: { p_shop_id: string }
        Returns: undefined
      }
      seed_default_delivery_zones: {
        Args: { p_shop_id: string }
        Returns: undefined
      }
      set_order_delivery_fee: {
        Args: { p_fee: number; p_order_id: string }
        Returns: {
          created_at: string
          customer_address: string | null
          customer_name: string
          customer_phone: string
          delivery_fee: number
          delivery_zone_name: string | null
          id: string
          order_number: string
          payment_method: string
          shop_id: string
          status: string
          total: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_order_status: {
        Args: { p_order_id: string; p_status: string }
        Returns: {
          created_at: string
          customer_address: string | null
          customer_name: string
          customer_phone: string
          delivery_fee: number
          delivery_zone_name: string | null
          id: string
          order_number: string
          payment_method: string
          shop_id: string
          status: string
          total: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

