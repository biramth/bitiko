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
  /** One line explaining what the block is for — shown in the "add block" picker. */
  description: string
  icon: typeof Type
  /** Tailwind gradient classes for the block's icon badge — gives each type a
   *  distinct identity at a glance instead of one flat gray icon for everything. */
  color: string
  /** Groups blocks in the "add block" picker (Shopify-style categories). */
  category: 'content' | 'commerce'
  /** Body sections can be added freely by the merchant; header/footer are fixed, one-per-shop. */
  pinned: boolean
  /** At most one instance per page — adding a second (e.g. two "Fiche produit"
   *  blocks) would just duplicate the same dynamic content, not add variety. */
  singleton?: boolean
  createDefault: () => LayoutSection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Editor: React.ComponentType<SectionEditorProps<any>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Renderer?: React.ComponentType<any>
}

export const SECTION_REGISTRY: Record<SectionType, SectionDefinition> = {
  header: {
    label: 'Header',
    description: 'Logo, navigation et panier — présent sur toutes les pages.',
    icon: PanelTop,
    color: 'from-slate-500 to-slate-700',
    category: 'content',
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
    description: 'Le grand titre d\'accroche en haut de page, avec votre bannière.',
    icon: LayoutTemplate,
    color: 'from-brand-500 to-brand-700',
    category: 'content',
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
    description: 'Un titre et un paragraphe libre — votre histoire, vos garanties…',
    icon: Type,
    color: 'from-blue-500 to-blue-700',
    category: 'content',
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
    description: 'Une image pleine largeur, avec légende et lien optionnels.',
    icon: ImageIcon,
    color: 'from-purple-500 to-purple-700',
    category: 'content',
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
    description: 'Une grille de vos catégories, pour naviguer le catalogue.',
    icon: Tags,
    color: 'from-teal-500 to-teal-700',
    category: 'commerce',
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
    description: 'La grille de produits — le cœur du catalogue.',
    icon: ShoppingBag,
    color: 'from-gold-400 to-gold-600',
    category: 'commerce',
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
    description: 'Une sélection choisie à la main — vos coups de cœur.',
    icon: Star,
    color: 'from-rose-400 to-rose-600',
    category: 'commerce',
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
    description: 'Un bandeau d\'offre avec bouton d\'appel à l\'action.',
    icon: Megaphone,
    color: 'from-red-500 to-red-700',
    category: 'content',
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
    description: 'Contact, réseaux sociaux et copyright — bas de chaque page.',
    icon: PanelBottom,
    color: 'from-slate-500 to-slate-700',
    category: 'content',
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
    description: 'Photos, prix et bouton d\'achat du produit consulté.',
    icon: PackageSearch,
    color: 'from-indigo-500 to-indigo-700',
    category: 'commerce',
    pinned: false,
    singleton: true,
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
    description: 'Le contenu du panier et le total, avant la commande.',
    icon: ShoppingCart,
    color: 'from-emerald-500 to-emerald-700',
    category: 'commerce',
    pinned: false,
    singleton: true,
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
    description: 'Le formulaire de livraison et de paiement final.',
    icon: CreditCard,
    color: 'from-cyan-500 to-cyan-700',
    category: 'commerce',
    pinned: false,
    singleton: true,
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
