// Types for the visual store builder ("Personnaliser ma boutique").
// A shop's home page is an ordered list of LayoutSection blocks; ThemeConfig
// holds the global design tokens layered on top of the existing `theme_color`
// accent. Both are stored as jsonb on `shops` (published columns) and mirrored
// inside `builder_draft` while a merchant is mid-edit.

export type SectionType =
  | 'header'
  | 'hero'
  | 'text'
  | 'image'
  | 'categories'
  | 'products'
  | 'featured_products'
  | 'promo'
  | 'footer'

export interface HeaderSectionConfig {
  showLogo: boolean
  showCatalogLink: boolean
  showContactLink: boolean
  sticky: boolean
}

export interface FooterSectionConfig {
  showContact: boolean
  showAddress: boolean
  showWhatsapp: boolean
  showSocialLinks: boolean
  copyrightText: string
}

export interface HeroSectionConfig {
  eyebrow: string
  heading: string
  subheading: string
  showBanner: boolean
}

export interface TextSectionConfig {
  heading: string
  body: string
  align: 'left' | 'center'
}

export interface ImageSectionConfig {
  imageUrl: string | null
  caption: string
  linkUrl: string
}

export interface CategoriesSectionConfig {
  heading: string
}

export interface ProductsSectionConfig {
  heading: string
  sort: 'recent' | 'price_asc' | 'price_desc'
  limit: number
}

export interface FeaturedProductsSectionConfig {
  heading: string
  productIds: string[]
}

export interface PromoSectionConfig {
  heading: string
  body: string
  buttonLabel: string
  buttonLink: string
  backgroundColor: string
}

export type SectionConfigMap = {
  header: HeaderSectionConfig
  hero: HeroSectionConfig
  text: TextSectionConfig
  image: ImageSectionConfig
  categories: CategoriesSectionConfig
  products: ProductsSectionConfig
  featured_products: FeaturedProductsSectionConfig
  promo: PromoSectionConfig
  footer: FooterSectionConfig
}

export type LayoutSection = {
  [K in SectionType]: { id: string; type: K; visible: boolean; config: SectionConfigMap[K] }
}[SectionType]

export type FontChoice = 'sora-inter' | 'inter' | 'sora'
export type TextScale = 'sm' | 'base' | 'lg'
export type RadiusScale = 'none' | 'md' | 'lg' | 'full'
export type ContentWidth = 'narrow' | 'normal' | 'wide'

export interface ThemeConfig {
  secondaryColor: string
  textColor: string
  backgroundColor: string
  buttonColor: string
  font: FontChoice
  textScale: TextScale
  radius: RadiusScale
  contentWidth: ContentWidth
}

export interface BuilderDraft {
  sections: LayoutSection[]
  themeColor: string
  themeConfig: ThemeConfig
}

export interface StoreTemplate {
  key: string
  label: string
  description: string
  swatch: [string, string]
  themeColor: string
  themeConfig: ThemeConfig
  sections: LayoutSection[]
}
