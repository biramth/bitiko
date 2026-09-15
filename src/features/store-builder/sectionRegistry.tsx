import {
  Image as ImageIcon,
  LayoutTemplate,
  Megaphone,
  PanelBottom,
  PanelTop,
  ShoppingBag,
  ShoppingCart,
  PackageSearch,
  CreditCard,
  Star,
  Tags,
  Type,
} from 'lucide-react'
import { createSectionId } from '@/config/defaultLayout'
import type {
  CategoriesSectionConfig,
  CartSectionConfig,
  CheckoutSectionConfig,
  FeaturedProductsSectionConfig,
  FooterSectionConfig,
  HeaderSectionConfig,
  HeroSectionConfig,
  ImageSectionConfig,
  LayoutSection,
  ProductSectionConfig,
  PromoSectionConfig,
  ProductsSectionConfig,
  SectionType,
  TextSectionConfig,
} from '@/types/builder'
import { CategoriesEditor, CategoriesRenderer } from './sections/CategoriesSection'
import { FeaturedProductsEditor, FeaturedProductsRenderer } from './sections/FeaturedProductsSection'
import { FooterEditor, HeaderEditor } from './sections/HeaderFooterEditors'
import { HeroEditor, HeroRenderer } from './sections/HeroSection'
import { ImageEditor, ImageRenderer } from './sections/ImageSection'
import { PromoEditor, PromoRenderer } from './sections/PromoSection'
import { ProductsEditor, ProductsRenderer } from './sections/ProductsSection'
import { TextEditor, TextRenderer } from './sections/TextSection'
import { ProductEditor, ProductRenderer } from './sections/ProductSection'
import { CartEditor, CartRenderer } from './sections/CartSection'
import { CheckoutEditor, CheckoutRenderer } from './sections/CheckoutSection'
import type { SectionEditorProps } from './sections/shared'

interface SectionDefinition {
  label: string
  icon: typeof Type
  /** Body sections can be added freely by the merchant; header/footer are fixed, one-per-shop. */
  pinned: boolean
  createDefault: () => LayoutSection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Editor: React.ComponentType<SectionEditorProps<any>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Renderer?: React.ComponentType<any>
}

export const SECTION_REGISTRY: Record<SectionType, SectionDefinition> = {
  header: {
    label: 'Header',
    icon: PanelTop,
    pinned: true,
    createDefault: () => ({
      id: createSectionId('header'),
      type: 'header',
      visible: true,
      config: { showLogo: true, showCatalogLink: true, showContactLink: true, sticky: true, menu: [] } satisfies HeaderSectionConfig,
    }),
    Editor: HeaderEditor,
  },
  hero: {
    label: 'Bannière / Hero',
    icon: LayoutTemplate,
    pinned: false,
    createDefault: () => ({
      id: createSectionId('hero'),
      type: 'hero',
      visible: true,
      config: { eyebrow: 'Boutique en ligne', heading: '', subheading: '', showBanner: true } satisfies HeroSectionConfig,
    }),
    Editor: HeroEditor,
    Renderer: HeroRenderer,
  },
  text: {
    label: 'Texte',
    icon: Type,
    pinned: false,
    createDefault: () => ({
      id: createSectionId('text'),
      type: 'text',
      visible: true,
      config: { heading: '', body: '', align: 'left' } satisfies TextSectionConfig,
    }),
    Editor: TextEditor,
    Renderer: TextRenderer,
  },
  image: {
    label: 'Image',
    icon: ImageIcon,
    pinned: false,
    createDefault: () => ({
      id: createSectionId('image'),
      type: 'image',
      visible: true,
      config: { imageUrl: null, caption: '', linkUrl: '' } satisfies ImageSectionConfig,
    }),
    Editor: ImageEditor,
    Renderer: ImageRenderer,
  },
  categories: {
    label: 'Catégories',
    icon: Tags,
    pinned: false,
    createDefault: () => ({
      id: createSectionId('categories'),
      type: 'categories',
      visible: true,
      config: { heading: '' } satisfies CategoriesSectionConfig,
    }),
    Editor: CategoriesEditor,
    Renderer: CategoriesRenderer,
  },
  products: {
    label: 'Produits',
    icon: ShoppingBag,
    pinned: false,
    createDefault: () => ({
      id: createSectionId('products'),
      type: 'products',
      visible: true,
      config: { heading: 'Nos produits', sort: 'recent', limit: 12 } satisfies ProductsSectionConfig,
    }),
    Editor: ProductsEditor,
    Renderer: ProductsRenderer,
  },
  featured_products: {
    label: 'Produits mis en avant',
    icon: Star,
    pinned: false,
    createDefault: () => ({
      id: createSectionId('featured_products'),
      type: 'featured_products',
      visible: true,
      config: { heading: 'Notre sélection', productIds: [] } satisfies FeaturedProductsSectionConfig,
    }),
    Editor: FeaturedProductsEditor,
    Renderer: FeaturedProductsRenderer,
  },
  promo: {
    label: 'Promotion',
    icon: Megaphone,
    pinned: false,
    createDefault: () => ({
      id: createSectionId('promo'),
      type: 'promo',
      visible: true,
      config: {
        heading: '',
        body: '',
        buttonLabel: "Voir l'offre",
        buttonLink: '/catalogue',
        backgroundColor: '',
      } satisfies PromoSectionConfig,
    }),
    Editor: PromoEditor,
    Renderer: PromoRenderer,
  },
  footer: {
    label: 'Footer',
    icon: PanelBottom,
    pinned: true,
    createDefault: () => ({
      id: createSectionId('footer'),
      type: 'footer',
      visible: true,
      config: {
        showContact: true,
        showAddress: true,
        showWhatsapp: true,
        showSocialLinks: true,
        copyrightText: '',
      } satisfies FooterSectionConfig,
    }),
    Editor: FooterEditor,
  },
  product: {
    label: 'Fiche produit',
    icon: PackageSearch,
    pinned: false,
    createDefault: () => ({
      id: createSectionId('product'),
      type: 'product',
      visible: true,
      config: {
        heading: '',
        showGallery: true,
        showTitle: true,
        showPrice: true,
        showDescription: true,
        showQuantity: true,
        showAddToCart: true,
      } satisfies ProductSectionConfig,
    }),
    Editor: ProductEditor,
    Renderer: ProductRenderer,
  },
  cart: {
    label: 'Panier',
    icon: ShoppingCart,
    pinned: false,
    createDefault: () => ({
      id: createSectionId('cart'),
      type: 'cart',
      visible: true,
      config: { heading: 'Mon panier' } satisfies CartSectionConfig,
    }),
    Editor: CartEditor,
    Renderer: CartRenderer,
  },
  checkout: {
    label: 'Commande',
    icon: CreditCard,
    pinned: false,
    createDefault: () => ({
      id: createSectionId('checkout'),
      type: 'checkout',
      visible: true,
      config: { heading: 'Finaliser la commande' } satisfies CheckoutSectionConfig,
    }),
    Editor: CheckoutEditor,
    Renderer: CheckoutRenderer,
  },
}

/** Types a merchant can add freely from the "+ Ajouter un bloc" menu (excludes pinned header/footer). */
export const ADDABLE_SECTION_TYPES = (Object.keys(SECTION_REGISTRY) as SectionType[]).filter(
  (type) => !SECTION_REGISTRY[type].pinned,
)
