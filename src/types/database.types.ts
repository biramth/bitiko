import type { BuilderDraft, LayoutSection, SystemTemplateKey, SystemTemplateMap, ThemeConfig } from './builder.js'
import type { StoreProfileAnswers } from '../features/onboarding/storeProfile.js'

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
      appointments: {
        Row: {
          created_at: string
          customer_name: string
          customer_phone: string
          end_at: string
          id: string
          notes: string | null
          service_duration: number | null
          service_id: string | null
          service_name: string | null
          service_price: number | null
          shop_id: string
          start_at: string
          status: string
          team_member_id: string | null
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_phone: string
          end_at: string
          id?: string
          notes?: string | null
          service_duration?: number | null
          service_id?: string | null
          service_name?: string | null
          service_price?: number | null
          shop_id: string
          start_at: string
          status?: string
          team_member_id?: string | null
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_phone?: string
          end_at?: string
          id?: string
          notes?: string | null
          service_duration?: number | null
          service_id?: string | null
          service_name?: string | null
          service_price?: number | null
          shop_id?: string
          start_at?: string
          status?: string
          team_member_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          channel: string
          created_at: string
          enabled: boolean
          event_type: string
          id: string
          shop_id: string
          template: { subject?: string; body?: string }
          updated_at: string
        }
        Insert: {
          channel: string
          created_at?: string
          enabled?: boolean
          event_type: string
          id?: string
          shop_id: string
          template?: { subject?: string; body?: string }
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          enabled?: boolean
          event_type?: string
          id?: string
          shop_id?: string
          template?: { subject?: string; body?: string }
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_entries: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          entry_date: string
          id: string
          kind: string
          label: string
          note: string | null
          payment_method: string | null
          shop_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          entry_date?: string
          id?: string
          kind: string
          label: string
          note?: string | null
          payment_method?: string | null
          shop_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          entry_date?: string
          id?: string
          kind?: string
          label?: string
          note?: string | null
          payment_method?: string | null
          shop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_entries_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_settings: {
        Row: {
          close_time: string
          closed_dates: string[]
          max_days_ahead: number
          open_days: number[]
          open_time: string
          reservation_minutes: number
          shop_id: string
          slot_minutes: number
          table_capacity: number
          timezone: string
          updated_at: string
          weekly_hours: Json | null
        }
        Insert: {
          close_time?: string
          closed_dates?: string[]
          max_days_ahead?: number
          open_days?: number[]
          open_time?: string
          reservation_minutes?: number
          shop_id: string
          slot_minutes?: number
          table_capacity?: number
          timezone?: string
          updated_at?: string
          weekly_hours?: Json | null
        }
        Update: {
          close_time?: string
          closed_dates?: string[]
          max_days_ahead?: number
          open_days?: number[]
          open_time?: string
          reservation_minutes?: number
          shop_id?: string
          slot_minutes?: number
          table_capacity?: number
          timezone?: string
          updated_at?: string
          weekly_hours?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_settings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      business_types: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          metadata: Json
          name: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          metadata?: Json
          name: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          metadata?: Json
          name?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      template_business_types: {
        Row: {
          template_id: string
          business_type_id: string
          created_at: string
        }
        Insert: {
          template_id: string
          business_type_id: string
          created_at?: string
        }
        Update: {
          template_id?: string
          business_type_id?: string
          created_at?: string
        }
        Relationships: []
      }
      templates: {
        Row: {
          id: string
          slug: string
          name: string
          description: string | null
          status: string
          content: Json | null
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description?: string | null
          status?: string
          content?: Json | null
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string | null
          status?: string
          content?: Json | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          emoji: string | null
          id: string
          image_url: string | null
          kind: string
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
          kind?: string
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
          kind?: string
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
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          first_order_at: string | null
          id: string
          last_order_at: string | null
          name: string
          orders_count: number
          phone: string
          shop_id: string
          total_spent: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          first_order_at?: string | null
          id?: string
          last_order_at?: string | null
          name?: string
          orders_count?: number
          phone: string
          shop_id: string
          total_spent?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          first_order_at?: string | null
          id?: string
          last_order_at?: string | null
          name?: string
          orders_count?: number
          phone?: string
          shop_id?: string
          total_spent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_shop_id_fkey"
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
          options: Json | null
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
          options?: Json | null
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
          options?: Json | null
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
          customer_email: string | null
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
          customer_email?: string | null
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
          customer_email?: string | null
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
      page_views: {
        Row: {
          created_at: string
          device: string | null
          id: string
          path: string
          referrer: string | null
          session_id: string
          shop_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device?: string | null
          id?: string
          path: string
          referrer?: string | null
          session_id: string
          shop_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device?: string | null
          id?: string
          path?: string
          referrer?: string | null
          session_id?: string
          shop_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_views_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      countries: {
        Row: {
          code: string
          created_at: string
          currency_code: string
          dial_code: string
          is_enabled: boolean
          name: string
          national_number_length: number
          national_regex: string
          timezone: string
          trunk_prefix: string
        }
        Insert: {
          code: string
          created_at?: string
          currency_code: string
          dial_code: string
          is_enabled?: boolean
          name: string
          national_number_length: number
          national_regex: string
          timezone?: string
          trunk_prefix?: string
        }
        Update: {
          code?: string
          created_at?: string
          currency_code?: string
          dial_code?: string
          is_enabled?: boolean
          name?: string
          national_number_length?: number
          national_regex?: string
          timezone?: string
          trunk_prefix?: string
        }
        Relationships: [
          {
            foreignKeyName: "countries_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          created_at: string
          decimal_digits: number
          name: string
          symbol: string
        }
        Insert: {
          code: string
          created_at?: string
          decimal_digits: number
          name: string
          symbol: string
        }
        Update: {
          code?: string
          created_at?: string
          decimal_digits?: number
          name?: string
          symbol?: string
        }
        Relationships: []
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
          image_url: string | null
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
          image_url?: string | null
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
          image_url?: string | null
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
          badge: string | null
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          option_fields: Json
          price: number
          shop_id: string
          slug: string
          stock: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          badge?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          option_fields?: Json
          price: number
          shop_id: string
          slug: string
          stock?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          badge?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          option_fields?: Json
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
      reservations: {
        Row: {
          created_at: string
          customer_name: string
          customer_phone: string
          id: string
          notes: string | null
          party_size: number
          shop_id: string
          source: string
          start_at: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_phone: string
          id?: string
          notes?: string | null
          party_size?: number
          shop_id: string
          source?: string
          start_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          notes?: string | null
          party_size?: number
          shop_id?: string
          source?: string
          start_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          category_id: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          name: string
          price: number
          shop_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          name: string
          price?: number
          shop_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          name?: string
          price?: number
          shop_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          active: boolean
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          rating: number | null
          role: string
          shop_id: string
          show_contact: boolean
          sort_order: number
          specialty: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          rating?: number | null
          role?: string
          shop_id: string
          show_contact?: boolean
          sort_order?: number
          specialty?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          rating?: number | null
          role?: string
          shop_id?: string
          show_contact?: boolean
          sort_order?: number
          specialty?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_shop_id_fkey"
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
          country_code: string
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: string
        }
        Insert: {
          address?: string | null
          country_code?: string
          created_at?: string
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          role?: string
        }
        Update: {
          address?: string | null
          country_code?: string
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
      platform_members: {
        Row: {
          created_at: string
          created_by: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_members_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          address: string | null
          banner_url: string | null
          builder_draft: BuilderDraft | null
          business_type: string | null
          business_type_id: string | null
          country_code: string
          created_at: string
          currency: string
          delivery_fee: number
          description: string | null
          free_delivery_threshold: number | null
          ga_measurement_id: string | null
          id: string
          layout_sections: LayoutSection[]
          logo_url: string | null
          low_stock_threshold: number
          name: string
          onboarding_responses: StoreProfileAnswers | null
          organization_id: string | null
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
          business_type?: string | null
          business_type_id?: string | null
          country_code?: string
          created_at?: string
          currency?: string
          delivery_fee?: number
          description?: string | null
          free_delivery_threshold?: number | null
          ga_measurement_id?: string | null
          id?: string
          layout_sections?: LayoutSection[]
          logo_url?: string | null
          low_stock_threshold?: number
          name: string
          onboarding_responses?: StoreProfileAnswers | null
          organization_id?: string | null
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
          business_type?: string | null
          business_type_id?: string | null
          country_code?: string
          created_at?: string
          currency?: string
          delivery_fee?: number
          description?: string | null
          free_delivery_threshold?: number | null
          ga_measurement_id?: string | null
          id?: string
          layout_sections?: LayoutSection[]
          logo_url?: string | null
          low_stock_threshold?: number
          name?: string
          onboarding_responses?: StoreProfileAnswers | null
          organization_id?: string | null
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
      shop_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string | null
          role: string
          shop_id: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          role?: string
          shop_id: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          role?: string
          shop_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_members_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_publish_history: {
        Row: {
          id: string
          published_at: string
          sections: LayoutSection[]
          shop_id: string
          templates: Partial<Record<SystemTemplateKey, LayoutSection[]>>
          theme_color: string
          theme_config: ThemeConfig
        }
        Insert: {
          id?: string
          published_at?: string
          sections?: LayoutSection[]
          shop_id: string
          templates?: Partial<Record<SystemTemplateKey, LayoutSection[]>>
          theme_color: string
          theme_config: ThemeConfig
        }
        Update: {
          id?: string
          published_at?: string
          sections?: LayoutSection[]
          shop_id?: string
          templates?: Partial<Record<SystemTemplateKey, LayoutSection[]>>
          theme_color?: string
          theme_config?: ThemeConfig
        }
        Relationships: [
          {
            foreignKeyName: "shop_publish_history_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_saved_themes: {
        Row: {
          created_at: string
          id: string
          name: string
          sections: LayoutSection[]
          shop_id: string
          templates: Partial<Record<SystemTemplateKey, LayoutSection[]>>
          theme_color: string
          theme_config: ThemeConfig
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sections?: LayoutSection[]
          shop_id: string
          templates?: Partial<Record<SystemTemplateKey, LayoutSection[]>>
          theme_color: string
          theme_config: ThemeConfig
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sections?: LayoutSection[]
          shop_id?: string
          templates?: Partial<Record<SystemTemplateKey, LayoutSection[]>>
          theme_color?: string
          theme_config?: ThemeConfig
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_saved_themes_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
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
          payer_phone: string | null
          plan: string
          proof_path: string | null
          proof_submitted_at: string | null
          rejection_reason: string | null
          shop_id: string
          status: string
          transaction_ref: string | null
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
          payer_phone?: string | null
          plan: string
          proof_path?: string | null
          proof_submitted_at?: string | null
          rejection_reason?: string | null
          shop_id: string
          status?: string
          transaction_ref?: string | null
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
          payer_phone?: string | null
          plan?: string
          proof_path?: string | null
          proof_submitted_at?: string | null
          rejection_reason?: string | null
          shop_id?: string
          status?: string
          transaction_ref?: string | null
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
      team_members_public: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          id: string | null
          name: string | null
          phone: string | null
          rating: number | null
          role: string | null
          shop_id: string | null
          sort_order: number | null
          specialty: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      business_type_capability_codes: {
        Args: { p_slug: string }
        Returns: string[]
      }
      shop_business_type_slug: {
        Args: { p_shop_id: string }
        Returns: string
      }
      shop_template_slugs: {
        Args: { p_shop_id: string }
        Returns: string[]
      }
      organization_role: {
        Args: { p_organization_id: string }
        Returns: string
      }
      get_platform_orders: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          customer_name: string
          customer_phone: string
          id: string
          order_number: string
          shop_id: string
          shop_name: string
          shop_slug: string
          status: string
          total: number
        }[]
      }
      get_platform_role: {
        Args: never
        Returns: string | null
      }
      get_platform_shops: {
        Args: never
        Returns: {
          created_at: string
          currency: string
          id: string
          name: string
          orders: number
          plan: string
          plan_status: string
          products: number
          revenue: number
          slug: string
          whatsapp_number: string
          owner_id: string
          owner_email: string | null
          country_code: string
          business_type: string | null
          subscribed_plan: string
          period_end: string | null
          last_order_at: string | null
        }[]
      }
      get_platform_stats: { Args: never; Returns: Json }
      get_shop_visit_stats: {
        Args: { p_shop_id: string }
        Returns: {
          visitors_30d: number
          visits_30d: number
          visits_today: number
        }[]
      }
      is_platform_admin: { Args: never; Returns: boolean }
      get_promo_offer: {
        Args: { p_shop_id: string }
        Returns: {
          code: string
          days: number
          description: string | null
          expires_at: string | null
          label: string
          plan: string
        }[]
      }
      get_landing_promo: {
        Args: never
        Returns: {
          code: string
          days: number
          description: string | null
          expires_at: string | null
          label: string
          plan: string
        }[]
      }
      redeem_promo_code: {
        Args: { p_code?: string; p_shop_id: string }
        Returns: string
      }
      claim_shop_invites: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
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
          options: Json
          order_number: string
          product_name: string
          quantity: number
          subtotal: number
          total: number
          unit_price: number
          variant_name: string | null
        }[]
      }
      set_order_customer_email: {
        Args: { p_email: string; p_order_id: string }
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
      create_appointment: {
        Args: {
          p_customer_name: string
          p_customer_phone: string
          p_service_id: string
          p_shop_id: string
          p_start_at: string
          p_team_member_id?: string | null
        }
        Returns: {
          created_at: string
          customer_name: string
          customer_phone: string
          end_at: string
          id: string
          notes: string | null
          service_duration: number | null
          service_id: string | null
          service_name: string | null
          service_price: number | null
          shop_id: string
          start_at: string
          status: string
          team_member_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "appointments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      finance_revenue_by_month: {
        Args: { p_from: string; p_shop_id: string; p_to: string }
        Returns: { amount: number; entries: number; month: string; source: string }[]
      }
      finance_top_items: {
        Args: { p_from: string; p_limit?: number; p_shop_id: string; p_to: string }
        Returns: { amount: number; kind: string; name: string; quantity: number }[]
      }
      get_booking_slots: {
        Args: { p_date: string; p_service_id: string; p_shop_id: string; p_team_member_id: string | null }
        Returns: { slot_start: string }[]
      }
      get_reservation_slots: {
        Args: { p_date: string; p_party_size: number; p_shop_id: string }
        Returns: { slot_start: string }[]
      }
      create_reservation: {
        Args: {
          p_customer_name: string
          p_customer_phone: string
          p_party_size: number
          p_shop_id: string
          p_start_at: string
        }
        Returns: {
          created_at: string
          customer_name: string
          customer_phone: string
          id: string
          notes: string | null
          party_size: number
          shop_id: string
          source: string
          start_at: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_appointment_status: {
        Args: { p_appointment_id: string; p_status: string }
        Returns: {
          created_at: string
          customer_name: string
          customer_phone: string
          end_at: string
          id: string
          notes: string | null
          service_id: string | null
          shop_id: string
          start_at: string
          status: string
          team_member_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "appointments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_reservation_status: {
        Args: { p_reservation_id: string; p_status: string }
        Returns: {
          created_at: string
          customer_name: string
          customer_phone: string
          id: string
          notes: string | null
          party_size: number
          shop_id: string
          source: string
          start_at: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "reservations"
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


