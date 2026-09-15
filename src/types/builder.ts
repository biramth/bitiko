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
  | 'product'
  | 'cart'
  | 'checkout'

/** An internal or external link in the header/footer menu. */
export interface NavigationLink {
  label: string
  href: string
}

export interface HeaderSectionConfig {
  showLogo: boolean
  showCatalogLink: boolean
  showContactLink: boolean
  sticky: boolean
  /** Custom navigation links rendered between the logo and right-side actions.
   *  When non-empty, these replace the default Catalogue/Contact links. */
  menu: NavigationLink[]
}

export interface FooterSectionConfig {
  showContact: boolean
  showAddress: boolean
  showWhatsapp: boolean
  showSocialLinks: boolean
  copyrightText: string
  /** Pro-only: lets the merchant remove "Propulsé par Bitiko" — ignored (always shown) on the free plan. */
  hideBitikoBranding?: boolean
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
  /** When true, the block adds the catalogue toolbar (search, category,
   *  sorting, count + pagination) above the grid. Used by the Catalogue
   *  template; off for a simple grid elsewhere. */
  enableFilters?: boolean
}

export interface FeaturedProductsSectionConfig {
  heading: string
  productIds: string[]
}

/** Dynamic "Fiche produit" block. Only meaningful on the product page, where
 *  it renders the commerce card (photos, price, quantity, add-to-cart) for the
 *  product being viewed via the route context. */
export interface ProductSectionConfig {
  heading: string
  showGallery: boolean
  showTitle: boolean
  showPrice: boolean
  showDescription: boolean
  showQuantity: boolean
  showAddToCart: boolean
}

/** Dynamic cart block: the live cart contents + totals, plus a checkout CTA. */
export interface CartSectionConfig {
  heading: string
}

/** Dynamic checkout block: the full order form. */
export interface CheckoutSectionConfig {
  heading: string
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
  product: ProductSectionConfig
  cart: CartSectionConfig
  checkout: CheckoutSectionConfig
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

/** System storefront templates (catalogue, product, cart, checkout). Each has
 *  its own independent body sections, mirroring Shopify's per-template editor.
 *  Stored as a jsonb map on `shops.page_templates`; the home page keeps its
 *  existing `layout_sections` / `builder_draft` columns. */
export type SystemTemplateKey = 'catalogue' | 'product' | 'cart' | 'checkout'

export interface SystemTemplateState {
  draft?: LayoutSection[]
  published?: LayoutSection[]
}

export type SystemTemplateMap = Partial<Record<SystemTemplateKey, SystemTemplateState>>

export const SYSTEM_TEMPLATE_KEYS: SystemTemplateKey[] = ['catalogue', 'product', 'cart', 'checkout']

export interface StoreTemplate {
  key: string
  label: string
  description: string
  swatch: [string, string]
  themeColor: string
  themeConfig: ThemeConfig
  sections: LayoutSection[]
}
