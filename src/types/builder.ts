// Types for the visual store builder ("Personnaliser ma boutique").
// A shop's home page is an ordered list of LayoutSection blocks; ThemeConfig
// holds the global design tokens layered on top of the existing `theme_color`
// accent. Both are stored as jsonb on `shops` (published columns) and mirrored
// inside `builder_draft` while a merchant is mid-edit.

/** Section types every template can use, regardless of vertical. */
export type CoreSectionType =
  | 'announcement'
  | 'header'
  | 'hero'
  | 'text'
  | 'image'
  | 'categories'
  | 'products'
  | 'featured_products'
  | 'promo'
  | 'faq'
  | 'footer'
  | 'product'
  | 'cart'
  | 'checkout'
  | 'flexible'

/** Section types a specific template contributes on top of the core set
 *  (see `TEMPLATE_EXTRA_SECTIONS` in `features/store-builder/templateSections.ts`).
 *  Grows as more templates gain their own sections — today just Lookbook,
 *  offered by the Mode template. */
export type TemplateSectionType = 'lookbook'

export type SectionType = CoreSectionType | TemplateSectionType

/** Per-text override of the shop's global typography (Réglages → Thème).
 *  Every field is optional: unset = inherit the theme's value. Attached to
 *  each text as a flat sibling `<field>Style` (never a nested map) because the
 *  builder's inline-edit patches are a shallow merge of the section config. */
export type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold'

export interface TextStyleOverride {
  color?: string
  font?: FontChoice
  weight?: TextWeight
  italic?: boolean
}

/** Structural layout presets, one union per section type. Unset = the
 *  section's original arrangement, so existing shops render unchanged. */
export type HeaderLayout = 'left-logo' | 'centered-logo' | 'split'
export type AnnouncementLayout = 'bar' | 'pill'
export type HeroLayout = 'image-full' | 'image-side' | 'text-only'
export type GridLayout = 'grid' | 'carousel'
export type PromoLayout = 'banner' | 'card'
export type FaqLayout = 'accordion' | 'grid'
export type LookbookLayout = 'grid' | 'masonry'
export type ProductLayout = 'gallery-left' | 'gallery-right'
export type CartLayout = 'stacked' | 'summary-aside'
export type FooterLayout = 'columns' | 'centered' | 'minimal'

/** An internal or external link in the header/footer menu. */
export interface NavigationLink {
  label: string
  href: string
}

/** Site-wide bar above the header — renders nothing until a message is set,
 *  same "empty = hidden" convention as Promo/FAQ. Colors default to the
 *  shop's own accent/button, kept overridable for the same reason the
 *  footer's are (a bar sitting above the page needs its own contrast pair,
 *  independent of the body's `--shop-bg`/`--shop-text`). */
export interface AnnouncementBarSectionConfig {
  message: string
  linkLabel: string
  linkUrl: string
  dismissible: boolean
  backgroundColor?: string
  textColor?: string
  messageStyle?: TextStyleOverride
  linkLabelStyle?: TextStyleOverride
  layout?: AnnouncementLayout
}

export interface HeaderSectionConfig {
  showLogo: boolean
  showCatalogLink: boolean
  showContactLink: boolean
  sticky: boolean
  /** Custom navigation links rendered between the logo and right-side actions.
   *  When non-empty, these replace the default Catalogue/Contact links. */
  menu: NavigationLink[]
  layout?: HeaderLayout
}

export interface FooterSectionConfig {
  showContact: boolean
  showAddress: boolean
  showWhatsapp: boolean
  showSocialLinks: boolean
  copyrightText: string
  /** Pro-only: lets the merchant remove "Propulsé par Bitiko" — ignored (always shown) on the free plan. */
  hideBitikoBranding?: boolean
  /** The footer defaults to its own dark surface regardless of the shop's
   *  theme background/button/text colors (a light shop theme would make a
   *  `--shop-bg`-driven footer nearly invisible against the page above it),
   *  so it gets its own optional trio here — same knobs as the rest of the
   *  builder, scoped to the footer. */
  backgroundColor?: string
  buttonColor?: string
  textColor?: string
  copyrightTextStyle?: TextStyleOverride
  layout?: FooterLayout
}

export interface HeroSectionConfig {
  eyebrow: string
  heading: string
  subheading: string
  showBanner: boolean
  /** Where the banner crops from when its aspect ratio doesn't match the
   *  screen — 0-100 percentages, defaulting to center (50/50). */
  bannerFocalX?: number
  bannerFocalY?: number
  /** When set (and showBanner is on), replaces the static banner image with
   *  a looping muted background video — the image and its focal point stay
   *  configured as a fallback/poster-equivalent for browsers that can't play it. */
  bannerVideoUrl?: string
  /** CTA button labels — both buttons' destinations stay fixed (catalogue /
   *  WhatsApp, the only two actions a hero can meaningfully send someone to)
   *  but their wording is a copy choice, so it's editable like everything
   *  else. Undefined = the historical hardcoded French copy. */
  primaryButtonLabel?: string
  whatsappButtonLabel?: string
  eyebrowStyle?: TextStyleOverride
  headingStyle?: TextStyleOverride
  subheadingStyle?: TextStyleOverride
  primaryButtonLabelStyle?: TextStyleOverride
  whatsappButtonLabelStyle?: TextStyleOverride
  layout?: HeroLayout
}

export interface TextSectionConfig {
  heading: string
  body: string
  align: 'left' | 'center'
  headingStyle?: TextStyleOverride
  bodyStyle?: TextStyleOverride
}

export interface ImageSectionConfig {
  imageUrl: string | null
  caption: string
  linkUrl: string
  captionStyle?: TextStyleOverride
  /** Where the image crops from when its aspect ratio doesn't match the
   *  container — 0-100 percentages, defaulting to center (50/50). */
  focalX?: number
  focalY?: number
  /** When set, replaces the image with a looping muted background video —
   *  the image and its focal point stay configured as a fallback. */
  videoUrl?: string
}

export interface CategoriesSectionConfig {
  heading: string
  headingStyle?: TextStyleOverride
  layout?: GridLayout
}

export interface ProductsSectionConfig {
  heading: string
  headingStyle?: TextStyleOverride
  layout?: GridLayout
  sort: 'recent' | 'price_asc' | 'price_desc'
  limit: number
  /** When true, the block adds the catalogue toolbar (search, category,
   *  sorting, count + pagination) above the grid. Used by the Catalogue
   *  template; off for a simple grid elsewhere. */
  enableFilters?: boolean
}

export interface FeaturedProductsSectionConfig {
  heading: string
  headingStyle?: TextStyleOverride
  layout?: GridLayout
  productIds: string[]
}

/** Dynamic "Fiche produit" block. Only meaningful on the product page, where
 *  it renders the commerce card (photos, price, quantity, add-to-cart) for the
 *  product being viewed via the route context. */
export interface ProductSectionConfig {
  heading: string
  headingStyle?: TextStyleOverride
  layout?: ProductLayout
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
  headingStyle?: TextStyleOverride
  layout?: CartLayout
  /** Progress bar toward the shop's free-delivery threshold (no-op if the
   *  shop hasn't set one). Optional for the same backward-compat reason as
   *  the product section's new toggles. */
  showFreeDeliveryProgress?: boolean
}

/** Dynamic checkout block: the full order form. */
export interface CheckoutSectionConfig {
  heading: string
  headingStyle?: TextStyleOverride
  /** Reassurance row above the submit button. */
  showTrustBadges?: boolean
}

export interface PromoSectionConfig {
  heading: string
  body: string
  buttonLabel: string
  buttonLink: string
  backgroundColor: string
  headingStyle?: TextStyleOverride
  bodyStyle?: TextStyleOverride
  buttonLabelStyle?: TextStyleOverride
  layout?: PromoLayout
}

export interface FaqSectionConfig {
  heading: string
  items: { question: string; answer: string }[]
  headingStyle?: TextStyleOverride
  /** One shared style for every question / every answer (a per-item style
   *  would mean up to 16 popovers on one section). */
  questionStyle?: TextStyleOverride
  answerStyle?: TextStyleOverride
  layout?: FaqLayout
}

export interface LookbookImage {
  id: string
  imageUrl: string | null
  caption: string
}

/** Mode-only editorial photo grid — the pilot template-specific section
 *  (see `TemplateSectionType`). */
export interface LookbookSectionConfig {
  heading: string
  images: LookbookImage[]
  headingStyle?: TextStyleOverride
  captionStyle?: TextStyleOverride
  layout?: LookbookLayout
}

/** The building blocks a "Section personnalisée" (flexible) can hold —
 *  Shopify-style blocks nested inside one section, rather than each being
 *  its own top-level section. Kept intentionally small (text, image, button,
 *  spacer): enough to compose a real layout without duplicating what the
 *  existing top-level sections already do well. */
export type FlexibleBlockType = 'text' | 'image' | 'button' | 'spacer'

export interface FlexibleTextBlock {
  id: string
  type: 'text'
  heading: string
  body: string
  align: 'left' | 'center'
  headingStyle?: TextStyleOverride
  bodyStyle?: TextStyleOverride
}

export interface FlexibleImageBlock {
  id: string
  type: 'image'
  imageUrl: string | null
  caption: string
  focalX?: number
  focalY?: number
}

export interface FlexibleButtonBlock {
  id: string
  type: 'button'
  label: string
  url: string
  style: 'solid' | 'outline'
  labelStyle?: TextStyleOverride
}

export interface FlexibleSpacerBlock {
  id: string
  type: 'spacer'
  height: 'sm' | 'md' | 'lg'
}

export type FlexibleBlock = FlexibleTextBlock | FlexibleImageBlock | FlexibleButtonBlock | FlexibleSpacerBlock

export interface FlexibleSectionConfig {
  blocks: FlexibleBlock[]
}

export type SectionConfigMap = {
  announcement: AnnouncementBarSectionConfig
  header: HeaderSectionConfig
  hero: HeroSectionConfig
  text: TextSectionConfig
  image: ImageSectionConfig
  categories: CategoriesSectionConfig
  products: ProductsSectionConfig
  featured_products: FeaturedProductsSectionConfig
  promo: PromoSectionConfig
  faq: FaqSectionConfig
  footer: FooterSectionConfig
  product: ProductSectionConfig
  cart: CartSectionConfig
  checkout: CheckoutSectionConfig
  lookbook: LookbookSectionConfig
  flexible: FlexibleSectionConfig
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
  /** Set when this draft came from applying a whole-store template (the
   *  "Styles" tab) and not yet superseded by another one — published
   *  alongside the rest of the draft so `shops.template_id` stays in sync
   *  with what's actually live instead of only reflecting onboarding. */
  templateId?: string
}

/** System storefront pages (catalogue, product, cart, checkout). The published
 *  body sections of each are stored as an array under `shops.page_templates`;
 *  their drafts live store-wide in `builder_draft.templates`. The home page
 *  keeps its existing `layout_sections` / `builder_draft` columns. */
export type SystemTemplateKey = 'catalogue' | 'product' | 'cart' | 'checkout' | 'not_found'

export interface SystemTemplateState {
  published?: LayoutSection[]
}

export type SystemTemplateMap = Partial<Record<SystemTemplateKey, SystemTemplateState>>

export const SYSTEM_TEMPLATE_KEYS: SystemTemplateKey[] = ['catalogue', 'product', 'cart', 'checkout', 'not_found']

/** A full-store design shipped by a template: the global theme plus a layout
 *  for every storefront page (home + the four system templates). Custom
 *  merchant pages keep their own content but inherit the same global theme. */
export interface StoreTemplateLayout {
  home: LayoutSection[]
  catalogue: LayoutSection[]
  product: LayoutSection[]
  cart: LayoutSection[]
  checkout: LayoutSection[]
  /** Optional — a vertical template with no opinion on the 404 page falls
   *  back to the generic default (see `buildDefaultSystemTemplate`). */
  not_found?: LayoutSection[]
}

export interface StoreTemplate {
  key: string
  /** Business type this template is designed for (see `config/verticals.ts`).
   *  A merchant only browses templates within their shop's current vertical
   *  — switching vertical is a separate, explicit choice in Réglages. */
  vertical: string
  label: string
  description: string
  swatch: [string, string]
  themeColor: string
  themeConfig: ThemeConfig
  layout: StoreTemplateLayout
}
