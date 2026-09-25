import {
  BellRing,
  Blocks,
  BookOpen,
  Calendar,
  CreditCard,
  HelpCircle,
  Image as ImageIcon,
  LayoutTemplate,
  Megaphone,
  PackageSearch,
  PanelBottom,
  PanelTop,
  Quote,
  Scissors,
  ShoppingBag,
  ShoppingCart,
  Star,
  Tags,
  Type,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import { createSectionId } from '@/config/defaultLayout'
import type {
  AnnouncementBarSectionConfig,
  AppointmentsSectionConfig,
  CategoriesSectionConfig,
  CartSectionConfig,
  CheckoutSectionConfig,
  CoreSectionType,
  FeaturedProductsSectionConfig,
  FeaturedServicesSectionConfig,
  FlexibleSectionConfig,
  FooterSectionConfig,
  HeaderSectionConfig,
  HeroSectionConfig,
  ImageSectionConfig,
  LayoutSection,
  MenuSectionConfig,
  ProductSectionConfig,
  PromoSectionConfig,
  ProductsSectionConfig,
  ReservationsSectionConfig,
  SectionType,
  ServicesSectionConfig,
  TeamSectionConfig,
  TextSectionConfig,
  TestimonialsSectionConfig,
  FaqSectionConfig,
} from '@/types/builder'
import { AnnouncementBarEditor } from './sections/AnnouncementBarEditor'
import { AppointmentsEditor, AppointmentsRenderer } from './sections/AppointmentsSection'
import { CategoriesEditor, CategoriesRenderer } from './sections/CategoriesSection'
import { FeaturedProductsEditor, FeaturedProductsRenderer } from './sections/FeaturedProductsSection'
import { FeaturedServicesEditor, FeaturedServicesRenderer } from './sections/FeaturedServicesSection'
import { FlexibleEditor, FlexibleRenderer } from './sections/FlexibleSection'
import { FooterEditor, HeaderEditor } from './sections/HeaderFooterEditors'
import { HeroEditor, HeroRenderer } from './sections/HeroSection'
import { ImageEditor, ImageRenderer } from './sections/ImageSection'
import { MenuEditor, MenuRenderer } from './sections/MenuSection'
import { PromoEditor, PromoRenderer } from './sections/PromoSection'
import { ProductsEditor, ProductsRenderer } from './sections/ProductsSection'
import { ReservationsEditor, ReservationsRenderer } from './sections/ReservationsSection'
import { ServicesEditor, ServicesRenderer } from './sections/ServicesSection'
import { TeamEditor, TeamRenderer } from './sections/TeamSection'
import { TextEditor, TextRenderer } from './sections/TextSection'
import { ProductEditor, ProductRenderer } from './sections/ProductSection'
import { CartEditor, CartRenderer } from './sections/CartSection'
import { CheckoutEditor, CheckoutRenderer } from './sections/CheckoutSection'
import { FaqEditor, FaqRenderer } from './sections/FaqSection'
import { TestimonialsEditor, TestimonialsRenderer } from './sections/TestimonialsSection'
import type { SectionEditorProps } from './sections/shared'

export interface SectionDefinition {
  label: string
  /** One line explaining what the block is for — shown in the "add block" picker. */
  description: string
  icon: typeof Type
  /** Tailwind gradient classes for the block's icon badge — gives each type a
   *  distinct identity at a glance instead of one flat gray icon for everything. */
  color: string
  /** Groups blocks in the "add block" picker (Shopify-style categories). */
  category: 'content' | 'commerce' | 'services'
  /** Body sections can be added freely by the merchant; header/footer are fixed, one-per-shop. */
  pinned: boolean
  /** At most one instance per page — adding a second (e.g. two "Fiche produit"
   *  blocks) would just duplicate the same dynamic content, not add variety. */
  singleton?: boolean
  /** Capabilities required to display this section (PHASE-07+). Empty = always visible. */
  capabilities?: string[]
  createDefault: () => LayoutSection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Editor: React.ComponentType<SectionEditorProps<any>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Renderer?: React.ComponentType<any>
}

/** A shop's actual registry (core + whatever its template contributes) is
 *  necessarily partial over the full `SectionType` union — most shops don't
 *  have a Lookbook renderer, for instance. Every consumer below resolves a
 *  definition with `registry[type]` and must handle it being absent (a
 *  stored section can outlive a template switch that stopped offering it). */
export type SectionRegistry = Partial<Record<SectionType, SectionDefinition>>

/** The section types every storefront can use regardless of template — the
 *  registry a shop with no template (or a template contributing nothing
 *  extra) resolves to. Templates layer their own section types on top of
 *  this via `getEffectiveRegistry` (see effectiveRegistry.ts); this object
 *  itself never varies by shop. */
export const CORE_SECTION_REGISTRY: Record<CoreSectionType, SectionDefinition> = {
  announcement: {
    label: 'Barre d\'annonce',
    description: 'Un message en haut de toutes les pages — promo, livraison offerte…',
    icon: BellRing,
    color: 'from-amber-500 to-amber-700',
    category: 'content',
    pinned: true,
    capabilities: [],
    createDefault: () => ({
      id: createSectionId('announcement'),
      type: 'announcement',
      visible: true,
      config: { message: '', linkLabel: '', linkUrl: '', dismissible: true } satisfies AnnouncementBarSectionConfig,
    }),
    Editor: AnnouncementBarEditor,
  },
  header: {
    label: 'Header',
    description: 'Logo, navigation et panier — présent sur toutes les pages.',
    icon: PanelTop,
    color: 'from-slate-500 to-slate-700',
    category: 'content',
    pinned: true,
    capabilities: ['HAS_SHOP'],
    createDefault: () => ({
      id: createSectionId('header'),
      type: 'header',
      visible: true,
      config: { showLogo: true, showCatalogLink: true, showContactLink: false, sticky: true, menu: [] } satisfies HeaderSectionConfig,
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
    capabilities: ['HAS_SHOP'],
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
    capabilities: ['HAS_SHOP'],
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
    capabilities: ['HAS_SHOP'],
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
    capabilities: ['HAS_PRODUCTS'],
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
    capabilities: ['HAS_PRODUCTS'],
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
    capabilities: ['HAS_PRODUCTS'],
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
    capabilities: ['HAS_PROMOTIONS'],
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
  faq: {
    label: 'Questions fréquentes',
    description: 'Répondez aux questions qui rassurent avant la commande.',
    icon: HelpCircle,
    color: 'from-cyan-500 to-cyan-700',
    category: 'content',
    pinned: false,
    capabilities: ['HAS_SHOP'],
    createDefault: () => ({
      id: createSectionId('faq'),
      type: 'faq',
      visible: true,
      config: {
        heading: 'Questions fréquentes',
        items: [{ question: 'Comment fonctionne la livraison ?', answer: '' }],
      } satisfies FaqSectionConfig,
    }),
    Editor: FaqEditor,
    Renderer: FaqRenderer,
  },
  testimonials: {
    label: 'Témoignages',
    description: 'Les avis de vos clientes — la preuve qui fait vendre.',
    icon: Quote,
    color: 'from-amber-400 to-amber-600',
    category: 'content',
    pinned: false,
    capabilities: ['HAS_REVIEWS'],
    createDefault: () => ({
      id: createSectionId('testimonials'),
      type: 'testimonials',
      visible: true,
      config: { heading: 'Elles parlent de nous', items: [{ name: '', text: '' }] } satisfies TestimonialsSectionConfig,
    }),
    Editor: TestimonialsEditor,
    Renderer: TestimonialsRenderer,
  },
  flexible: {
    label: 'Section personnalisée',
    description: 'Composez librement avec des blocs texte, image, bouton et espacement.',
    icon: Blocks,
    color: 'from-violet-500 to-violet-700',
    category: 'content',
    pinned: false,
    capabilities: ['HAS_SHOP'],
    createDefault: () => ({
      id: createSectionId('flexible'),
      type: 'flexible',
      visible: true,
      config: { blocks: [] } satisfies FlexibleSectionConfig,
    }),
    Editor: FlexibleEditor,
    Renderer: FlexibleRenderer,
  },
  footer: {
    label: 'Footer',
    description: 'Contact, réseaux sociaux et copyright — bas de chaque page.',
    icon: PanelBottom,
    color: 'from-slate-500 to-slate-700',
    category: 'content',
    pinned: true,
    capabilities: ['HAS_SHOP'],
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
    capabilities: ['HAS_PRODUCTS'],
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
        showTrustBadges: true,
        showRelatedProducts: true,
        showRecentlyViewed: true,
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
    capabilities: ['HAS_PRODUCTS', 'HAS_ORDERS'],
    createDefault: () => ({
      id: createSectionId('cart'),
      type: 'cart',
      visible: true,
      config: { heading: 'Mon panier', showFreeDeliveryProgress: true } satisfies CartSectionConfig,
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
    capabilities: ['HAS_PRODUCTS', 'HAS_ORDERS'],
    createDefault: () => ({
      id: createSectionId('checkout'),
      type: 'checkout',
      visible: true,
      config: { heading: 'Finaliser la commande', showTrustBadges: true } satisfies CheckoutSectionConfig,
    }),
    Editor: CheckoutEditor,
    Renderer: CheckoutRenderer,
  },
  // ── Service sections (require HAS_SERVICES / HAS_APPOINTMENTS etc.) ──
  services: {
    label: 'Services / Prestations',
    description: 'Vos prestations avec durée, tarif et description — pour coiffeurs, artisans, consultants.',
    icon: Scissors,
    color: 'from-sky-500 to-sky-700',
    category: 'services',
    pinned: false,
    capabilities: ['HAS_SERVICES'],
    createDefault: () => ({
      id: createSectionId('services'),
      type: 'services',
      visible: true,
      config: { heading: 'Nos prestations', sort: 'manual', limit: 12 } satisfies ServicesSectionConfig,
    }),
    Editor: ServicesEditor,
    Renderer: ServicesRenderer,
  },
  featured_services: {
    label: 'Services mis en avant',
    description: 'Une sélection de vos meilleures prestations — coupes signature, forfaits…',
    icon: Star,
    color: 'from-rose-400 to-rose-600',
    category: 'services',
    pinned: false,
    capabilities: ['HAS_SERVICES'],
    createDefault: () => ({
      id: createSectionId('featured_services'),
      type: 'featured_services',
      visible: true,
      config: { heading: 'Nos coups de cœur', serviceIds: [] } satisfies FeaturedServicesSectionConfig,
    }),
    Editor: FeaturedServicesEditor,
    Renderer: FeaturedServicesRenderer,
  },
  appointments: {
    label: 'Prise de rendez-vous',
    description: 'Calendrier interactif pour que vos clientes réservent leurs créneaux (coiffure, soins, consultations).',
    icon: Calendar,
    color: 'from-emerald-500 to-emerald-700',
    category: 'services',
    pinned: false,
    singleton: true,
    capabilities: ['HAS_APPOINTMENTS', 'HAS_CALENDAR'],
    createDefault: () => ({
      id: createSectionId('appointments'),
      type: 'appointments',
      visible: true,
      config: { heading: 'Réserver', showTeam: true, defaultDuration: 30 } satisfies AppointmentsSectionConfig,
    }),
    Editor: AppointmentsEditor,
    Renderer: AppointmentsRenderer,
  },
  team: {
    label: 'Équipe',
    description: 'Présentez vos collaborateurs — coiffeurs, serveurs, artisans — avec photo, spécialité et disponibilités.',
    icon: Users,
    color: 'from-amber-500 to-amber-700',
    category: 'services',
    pinned: false,
    capabilities: ['HAS_TEAM'],
    createDefault: () => ({
      id: createSectionId('team'),
      type: 'team',
      visible: true,
      config: { heading: 'Notre équipe', layout: 'grid' } satisfies TeamSectionConfig,
    }),
    Editor: TeamEditor,
    Renderer: TeamRenderer,
  },
  reservations: {
    label: 'Réservations',
    description: 'Réservation de tables, places ou créneaux (restaurant, atelier, événement).',
    icon: BookOpen,
    color: 'from-orange-500 to-orange-700',
    category: 'services',
    pinned: false,
    singleton: true,
    capabilities: ['HAS_RESERVATIONS'],
    createDefault: () => ({
      id: createSectionId('reservations'),
      type: 'reservations',
      visible: true,
      config: { heading: 'Réserver une table', showAvailability: true } satisfies ReservationsSectionConfig,
    }),
    Editor: ReservationsEditor,
    Renderer: ReservationsRenderer,
  },
  menu: {
    label: 'Menu / Carte',
    description: 'Votre carte restaurant ou menu de prestations — plats, boissons, formules, allergènes.',
    icon: UtensilsCrossed,
    color: 'from-lime-500 to-lime-700',
    category: 'services',
    pinned: false,
    capabilities: ['HAS_SERVICES', 'HAS_PRODUCTS'],
    createDefault: () => ({
      id: createSectionId('menu'),
      type: 'menu',
      visible: true,
      config: { heading: 'Notre carte', showPrices: true, showAllergens: true } satisfies MenuSectionConfig,
    }),
    Editor: MenuEditor,
    Renderer: MenuRenderer,
  },
}

/** Types a merchant can add freely from the "+ Ajouter un bloc" menu (excludes pinned header/footer). */
export function getAddableSectionTypes(registry: SectionRegistry): SectionType[] {
  return (Object.keys(registry) as SectionType[]).filter((type) => !registry[type]?.pinned)
}
