import type { LayoutSection } from './builder'

export interface StorePage {
  id: string
  shop_id: string
  title: string
  slug: string
  content: LayoutSection[]
  draft_content: LayoutSection[] | null
  seo_title: string | null
  seo_description: string | null
  is_published: boolean
  created_at: string
  updated_at: string
}