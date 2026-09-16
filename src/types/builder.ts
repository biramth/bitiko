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
  /** Reassurance row (paiement à la livraison, WhatsApp…) under the CTA.
   *  Optional so shops saved before this field existed keep it on — see the
   *  `!== false` checks in ProductSection.tsx. */
  showTrustBadges?: boolean
  /** "Vous aimerez aussi" cross-sell row, same category first. */
  showRelatedProducts?: boolean
  /** "Vu récemment" row, sourced from the visitor's own browsing history. */
  showRecentlyViewed?: boolean
}

/** Dynamic cart block: the live cart contents + totals, plus a checkout CTA. */
export interface CartSectionConfig {
  heading: string
  /** Progress bar toward the shop's free-delivery threshold (no-op if the
   *  shop hasn't set one). Optional for the same backward-compat reason as
   *  the product section's new toggles. */
  showFreeDeliveryProgress?: boolean
}

/** Dynamic checkout block: the full order form. */
export interface CheckoutSectionConfig {
  heading: string
  /** Reassurance row above the submit button. */
  showTrustBadges?: boolean
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

/** A store-wide WIP snapshot: the global theme, the home page sections and
 *  the draft body sections of every system template (catalogue, product, cart,
 *  checkout). Everything lives in this single jsonb so that applying — and
 *  publishing — a template touches the whole store at once. */
export interface BuilderDraft {
  sections: LayoutSection[]
  themeColor: string
  themeConfig: ThemeConfig
  /** Draft body sections of the system templates, keyed by template. */
  templates?: Partial<Record<SystemTemplateKey, LayoutSection[]>>
}

/** System storefront pages (catalogue, product, cart, checkout). The published
 *  body sections of each are stored as an array under `shops.page_templates`;
 *  their drafts live store-wide in `builder_draft.templates`. The home page
 *  keeps its existing `layout_sections` / `builder_draft` columns. */
export type SystemTemplateKey = 'catalogue' | 'product' | 'cart' | 'checkout'

export interface SystemTemplateState {
  published?: LayoutSection[]
}

export type SystemTemplateMap = Partial<Record<SystemTemplateKey, SystemTemplateState>>

export const SYSTEM_TEMPLATE_KEYS: SystemTemplateKey[] = ['catalogue', 'product', 'cart', 'checkout']

/** A full-store design shipped by a template: the global theme plus a layout
 *  for every storefront page (home + the four system templates). Custom
 *  merchant pages keep their own content but inherit the same global theme. */
export interface StoreTemplateLayout {
  home: LayoutSection[]
  catalogue: LayoutSection[]
  product: LayoutSection[]
  cart: LayoutSection[]
  checkout: LayoutSection[]
}

export interface StoreTemplate {
  key: string
  label: string
  description: string
  swatch: [string, string]
  themeColor: string
  themeConfig: ThemeConfig
  layout: StoreTemplateLayout
}
