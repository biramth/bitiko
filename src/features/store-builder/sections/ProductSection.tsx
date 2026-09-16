import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  Truck,
  X,
  ZoomIn,
} from 'lucide-react'
import { useProduct, useRelatedProducts } from '@/features/products/useProducts'
import { StockBadge } from '@/features/products/StockBadge'
import { ProductCard } from '@/features/products/ProductCard'
import { useRecentlyViewed, type RecentlyViewedEntry } from '@/features/products/useRecentlyViewed'
import { useCart } from '@/features/cart/CartContext'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency } from '@/utils/format'
import { useBreadcrumbStructuredData, type BreadcrumbCrumb } from '@/hooks/useBreadcrumbStructuredData'
import { useIsEmbeddedPreview } from '../useEmbeddedPreview'
import type { Product, ProductWithRelations, Shop } from '@/types'
import type { ProductSectionConfig } from '@/types/builder'
import { editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'

type ProductImage = { public_url: string; id: string }

/** Fullscreen photo viewer opened by clicking the main product image. */
function ImageLightbox({
  images,
  activeImage,
  onSelect,
  onClose,
  productName,
}: {
  images: ProductImage[]
  activeImage: number
  onSelect: (index: number) => void
  onClose: () => void
  productName: string
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onSelect((activeImage + 1) % images.length)
      if (e.key === 'ArrowLeft') onSelect((activeImage - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeImage, images.length, onClose, onSelect])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Photo de ${productName}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/95 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <X size={20} aria-hidden />
      </button>

      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onSelect((activeImage - 1 + images.length) % images.length)
          }}
          aria-label="Photo précédente"
          className="absolute left-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-4"
        >
          <ChevronLeft size={22} aria-hidden />
        </button>
      )}

      <img
        src={images[activeImage].public_url}
        alt={productName}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] max-w-full object-contain"
      />

      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onSelect((activeImage + 1) % images.length)
          }}
          aria-label="Photo suivante"
          className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-4"
        >
          <ChevronRight size={22} aria-hidden />
        </button>
      )}
    </div>
  )
}

/** Small reassurance row: this platform always checks out via WhatsApp with
 *  pay-on-delivery or mobile money, so these three claims hold for every shop. */
function TrustBadges() {
  const badges = [
    { icon: ShieldCheck, label: 'Paiement à la livraison' },
    { icon: Truck, label: 'Livraison à domicile' },
    { icon: MessageCircle, label: 'Confirmation sur WhatsApp' },
  ]
  return (
    <ul className="mt-5 flex flex-col gap-2 border-t border-ink-900/10 pt-5 text-xs text-ink-700/70">
      {badges.map(({ icon: Icon, label }) => (
        <li key={label} className="flex items-center gap-2">
          <Icon size={15} className="shrink-0 text-ink-700/50" aria-hidden />
          {label}
        </li>
      ))}
    </ul>
  )
}

function ProductDetails({
  product,
  config,
  currency,
  lowStockThreshold,
}: {
  product: Product & {
    category?: { name: string; slug: string } | null
    images: ProductImage[]
    variants?: { id: string; name: string; price: number | null; stock: number; active: boolean }[]
  }
  config: ProductSectionConfig
  currency: string
  lowStockThreshold: number
}) {
  const { addItem } = useCart()
  const toast = useToast()
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [added, setAdded] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const images = product.images
  const variants = (product.variants ?? []).filter((v) => v.active)
  const hasVariants = variants.length > 0
  const [selectedVariant, setSelectedVariant] = useState(0)
  // Reset out-of-range selection (e.g. the product changed) during render
  // rather than in an effect — avoids an extra render pass for something
  // that's really just clamping a derived value.
  if (selectedVariant !== 0 && (!hasVariants || selectedVariant >= variants.length)) {
    setSelectedVariant(0)
  }
  const variant = hasVariants ? variants[selectedVariant] : null

  const displayPrice = hasVariants && variant ? (variant.price ?? product.price) : product.price
  const displayStock = hasVariants && variant ? variant.stock : product.stock
  const outOfStock = displayStock <= 0

  const ctaSentinelRef = useRef<HTMLDivElement>(null)
  const [ctaVisible, setCtaVisible] = useState(true)
  useEffect(() => {
    const el = ctaSentinelRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setCtaVisible(entry.isIntersecting), { threshold: 0 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const crumbs = useMemo<BreadcrumbCrumb[]>(() => {
    const list: BreadcrumbCrumb[] = [{ name: 'Catalogue', path: '/catalogue' }]
    if (product.category) list.push({ name: product.category.name, path: `/catalogue?categorie=${product.category.slug}` })
    list.push({ name: product.name, path: `/produits/${product.slug}` })
    return list
  }, [product.category, product.name, product.slug])
  useBreadcrumbStructuredData(crumbs)

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      variantId: variant?.id,
      variantName: variant?.name,
      name: product.name,
      slug: product.slug,
      price: displayPrice,
      quantity,
      imageUrl: images[0]?.public_url ?? null,
      stock: displayStock,
    })
    setAdded(true)
    toast.success(`« ${product.name} » ajouté au panier.`)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <nav className="mb-6 text-xs font-medium uppercase tracking-wide text-ink-700/40">
          <Link to="/catalogue" className="hover:text-ink-900">Catalogue</Link>
          {product.category && (
            <>
              <span className="mx-1.5">/</span>
              <Link to={`/catalogue?categorie=${product.category.slug}`} className="hover:text-ink-900">{product.category.name}</Link>
            </>
          )}
        </nav>

        <div className="grid gap-10 md:grid-cols-2 md:gap-16">
          {config.showGallery && (
            <div>
              <button
                type="button"
                onClick={() => images.length > 0 && setLightboxOpen(true)}
                aria-label={images.length > 0 ? `Agrandir la photo de ${product.name}` : undefined}
                disabled={images.length === 0}
                className="group relative aspect-[4/5] w-full overflow-hidden bg-sand-100"
              >
                {images[activeImage] ? (
                  <>
                    <img src={images[activeImage].public_url} alt={product.name} className={`h-full w-full object-cover ${outOfStock ? 'opacity-60 grayscale' : ''}`} />
                    <span className="pointer-events-none absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-ink-900 opacity-0 transition-opacity group-hover:opacity-100">
                      <ZoomIn size={16} aria-hidden />
                    </span>
                  </>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-ink-200"><ImageOff size={48} aria-hidden /></div>
                )}
              </button>
              {images.length > 1 && (
                <div className="mt-4 flex gap-4" role="tablist" aria-label={`Photos de ${product.name}`}>
                  {images.map((img, i) => (
                    <button key={img.id} role="tab" aria-selected={i === activeImage} onClick={() => setActiveImage(i)} className={`h-16 w-16 overflow-hidden border-b-2 transition-colors ${i === activeImage ? 'border-ink-900' : 'border-transparent opacity-50 hover:opacity-100'}`}>
                      <img src={img.public_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="md:pt-2">
            {product.category && config.showTitle && (
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-700/40">{product.category.name}</p>
            )}
            {config.showTitle && (
              <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">{product.name}</h1>
            )}
            {config.showPrice && (
              <p className="mt-4 text-xl font-semibold text-ink-900">
                {formatCurrency(displayPrice, currency)}
              </p>
            )}
            {hasVariants && (
              <div className="mt-4">
                <p className="text-sm font-medium text-ink-900">Choisissez une variante</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {variants.map((v, i) => {
                    const isSelected = i === selectedVariant
                    const soldOut = v.stock <= 0
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={soldOut}
                        onClick={() => setSelectedVariant(i)}
                        aria-pressed={isSelected}
                        className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                          isSelected
                            ? 'border-ink-900 bg-ink-900 text-white'
                            : 'border-ink-900/20 text-ink-900 hover:border-ink-900/50'
                        } ${soldOut ? 'cursor-not-allowed opacity-40' : ''}`}
                      >
                        {v.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            <div className="mt-2">
              <StockBadge stock={displayStock} lowStockThreshold={lowStockThreshold} />
            </div>
            {config.showDescription && product.description && (
              <p className="mt-6 whitespace-pre-line leading-relaxed text-ink-700/70">{product.description}</p>
            )}

            {config.showQuantity && (
              <div className="mt-8 flex items-center gap-6">
                <div className="flex items-center gap-4">
                  <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={outOfStock} aria-label="Diminuer la quantité" className="text-ink-700 hover:text-ink-900 disabled:opacity-30"><Minus size={16} /></button>
                  <span className="w-4 text-center text-sm font-semibold text-ink-900">{quantity}</span>
                  <button onClick={() => setQuantity((q) => Math.min(displayStock, q + 1))} disabled={outOfStock || quantity >= displayStock} aria-label="Augmenter la quantité" className="text-ink-700 hover:text-ink-900 disabled:opacity-30"><Plus size={16} /></button>
                </div>
              </div>
            )}

            {config.showAddToCart && (
              <div ref={ctaSentinelRef}>
                <button onClick={handleAddToCart} disabled={outOfStock} className="mt-4 flex w-full items-center justify-center gap-2 bg-[var(--shop-button)] px-6 py-4 text-sm font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-sand-200 disabled:text-ink-700/40">
                  {outOfStock ? 'Rupture de stock' : added ? <><Check size={16} aria-hidden /> Ajouté</> : 'Ajouter au panier'}
                </button>
              </div>
            )}
            <div aria-live="polite">
              {added && (
                <Link to="/panier" className="mt-3 inline-block text-sm font-medium text-ink-900 underline underline-offset-2">
                  Voir le panier →
                </Link>
              )}
            </div>

            {config.showTrustBadges !== false && <TrustBadges />}
          </div>
        </div>
      </div>

      {config.showAddToCart && !ctaVisible && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-ink-900/10 bg-[var(--shop-bg)] px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] sm:hidden">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-ink-700/60">{product.name}</p>
            <p className="text-sm font-bold text-ink-900">{formatCurrency(displayPrice, currency)}</p>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={outOfStock}
            className="shrink-0 bg-[var(--shop-button)] px-5 py-3 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-sand-200 disabled:text-ink-700/40"
          >
            {outOfStock ? 'Rupture' : added ? 'Ajouté ✓' : 'Ajouter'}
          </button>
        </div>
      )}

      {lightboxOpen && images.length > 0 && (
        <ImageLightbox
          images={images}
          activeImage={activeImage}
          onSelect={setActiveImage}
          onClose={() => setLightboxOpen(false)}
          productName={product.name}
        />
      )}
    </>
  )
}

/** "Vous aimerez aussi" — same-category cross-sell, hidden while there's
 *  nothing relevant to show (new shop, single-product catalogue…). */
function RelatedProducts({
  shop,
  categoryId,
  excludeProductId,
}: {
  shop: Shop
  categoryId: string | null
  excludeProductId: string
}) {
  const { data: related } = useRelatedProducts(shop.id, categoryId, excludeProductId, 4)
  if (!related || related.length === 0) return null

  return (
    <section className="mx-auto max-w-6xl border-t border-ink-900/10 px-4 py-10 sm:px-6">
      <h2 className="font-heading text-lg font-bold text-[var(--shop-text)]">Vous aimerez aussi</h2>
      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 sm:gap-x-6">
        {related.map((product) => (
          <ProductCard key={product.id} product={product} currency={shop.currency} lowStockThreshold={shop.low_stock_threshold} />
        ))}
      </div>
    </section>
  )
}

/** Client-only "vu récemment" row, backed by localStorage — never shows the
 *  product currently being viewed, and stays empty until there's history. */
function RecentlyViewedRow({ shop, product }: { shop: Shop; product: ProductWithRelations }) {
  const currentEntry = useMemo<RecentlyViewedEntry>(
    () => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      imageUrl: product.images[0]?.public_url ?? null,
    }),
    [product.id, product.slug, product.name, product.price, product.images],
  )
  const items = useRecentlyViewed(currentEntry)
  if (items.length === 0) return null

  return (
    <section className="mx-auto max-w-6xl border-t border-ink-900/10 px-4 py-10 sm:px-6">
      <h2 className="font-heading text-lg font-bold text-[var(--shop-text)]">Vu récemment</h2>
      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 sm:gap-x-6">
        {items.map((item) => (
          <Link key={item.id} to={`/produits/${item.slug}`} className="group block">
            <div className="aspect-[4/5] w-full overflow-hidden bg-sand-100">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-ink-200"><ImageOff size={32} aria-hidden /></div>
              )}
            </div>
            <p className="mt-3 truncate text-sm text-ink-900 group-hover:underline group-hover:decoration-ink-900/40 group-hover:underline-offset-2">
              {item.name}
            </p>
            <p className="text-sm font-semibold text-ink-900">{formatCurrency(item.price, shop.currency)}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}

export function ProductRenderer({ shop, config }: { shop: Shop; config: ProductSectionConfig }) {
  const { slug } = useParams<{ slug: string }>()
  const isEmbeddedPreview = useIsEmbeddedPreview()
  const { data: product, isLoading, isError } = useProduct(shop?.id, slug)
  const currency = shop.currency ?? 'XOF'

  if (!slug) {
    if (isEmbeddedPreview) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center text-ink-700/50">
          Bloc « Fiche produit » — s'affiche sur la page produit.
        </div>
      )
    }
    return null
  }

  if (isLoading) return <Spinner />
  if (isError || !product) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-ink-700">Ce produit n'existe pas ou n'est plus disponible.</p>
        <Link to="/catalogue" className="mt-4 inline-block text-sm font-medium text-ink-900 underline underline-offset-2">
          Retour au catalogue
        </Link>
      </div>
    )
  }

  return (
    <>
      <ProductDetails
        product={product}
        config={config}
        currency={currency}
        lowStockThreshold={shop.low_stock_threshold}
      />
      {config.showRelatedProducts !== false && (
        <RelatedProducts shop={shop} categoryId={product.category_id} excludeProductId={product.id} />
      )}
      {config.showRecentlyViewed !== false && <RecentlyViewedRow shop={shop} product={product} />}
    </>
  )
}

export function ProductEditor({ config, onChange }: SectionEditorProps<ProductSectionConfig>) {
  // `=== false` (not `!config[key]`) so a field absent from an older saved
  // config — the three new optional toggles below — reads as "on" here too,
  // matching the renderer's own backward-compatible default.
  const toggle = (key: keyof ProductSectionConfig) => onChange({ ...config, [key]: config[key] === false })
  const keys = [
    'showGallery',
    'showTitle',
    'showPrice',
    'showDescription',
    'showQuantity',
    'showAddToCart',
    'showTrustBadges',
    'showRelatedProducts',
    'showRecentlyViewed',
  ] as const
  const labels: Record<(typeof keys)[number], string> = {
    showGallery: 'Galerie photos',
    showTitle: 'Titre',
    showPrice: 'Prix',
    showDescription: 'Description',
    showQuantity: 'Quantité',
    showAddToCart: 'Ajouter au panier',
    showTrustBadges: 'Badges de réassurance (paiement, WhatsApp…)',
    showRelatedProducts: 'Produits similaires ("Vous aimerez aussi")',
    showRecentlyViewed: 'Produits vus récemment',
  }
  return (
    <div className="space-y-4">
      <div>
        <label className={editorLabelClass}>Titre (superposé)</label>
        <input value={config.heading} onChange={(e) => onChange({ ...config, heading: e.target.value })} className={editorInputClass} />
      </div>
      {keys.map((key) => (
        <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={config[key] !== false} onChange={() => toggle(key)} className="accent-brand-600" />
          {labels[key]}
        </label>
      ))}
    </div>
  )
}
