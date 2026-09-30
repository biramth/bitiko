import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  MessageCircle,
  Minus,
  Pause,
  Play,
  Plus,
  Share2,
  X,
  ZoomIn,
} from 'lucide-react'
import { useProduct, useRelatedProducts } from '@/features/products/useProducts'
import { useActiveShopPromos } from '@/features/cms/useCmsContent'
import { badgeForProduct } from '@/features/promos/promoTargeting'
import { StockBadge } from '@/features/products/StockBadge'
import { ProductCard } from '@/features/products/ProductCard'
import { useRecentlyViewed, type RecentlyViewedEntry } from '@/features/products/useRecentlyViewed'
import { useCart } from '@/features/cart/CartContext'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { trackEvent } from '@/lib/analytics'
import { formatPrice } from '@/utils/format'
import { thumbSrcSet } from '@/utils/image'
import { MAX_OPTION_TEXT_LENGTH, parseOptionFields, resolveSelection } from '@/utils/productOptions'
import { effectivePrice } from '@/utils/productPricing'
import { useBreadcrumbStructuredData, type BreadcrumbCrumb } from '@/hooks/useBreadcrumbStructuredData'
import { useIsEmbeddedPreview } from '../useEmbeddedPreview'
import type { Product, ProductWithRelations, SelectedOption, Shop } from '@/types'
import type { ProductLayout, ProductSectionConfig, ThemeConfig } from '@/types/builder'
import { sectionHeadingClass } from '@/config/themeTokens'
import { editorHelpClass, editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'
import { resolveTextStyle } from '@/config/textStyle'
import { TextStyleField } from '../components/TextStyleControls'
import { DeliveryPaymentInfo } from '../components/DeliveryPaymentInfo'
import { VisualPicker } from '../components/VisualPicker'
import { SwatchBar, SwatchBlock, SwatchFrame } from '../components/LayoutSwatch'
import { FadeImage } from '@/components/ui/FadeImage'

type ProductImage = { public_url: string; thumb_url?: string | null; id: string }

/** One selectable photo on the product page: a gallery photo or a variant's
 *  photo (variantId set). The merchant's photo budget (free plan: 3 total —
 *  1 main + 1 per variant) is what feeds this list. thumb_url feeds the
 *  thumbnail strip; the main view and lightbox keep the full file. */
type GalleryImage = { public_url: string; thumb_url: string | null; id: string; variantId: string | null }

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

      <FadeImage
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

function ProductDetails({
  shop,
  product,
  config,
  currency,
  lowStockThreshold,
  whatsappNumber,
  themeConfig,
  promoBadge = null,
}: {
  shop: Shop
  product: Product & {
    category?: { name: string; slug: string } | null
    images: ProductImage[]
    variants?: { id: string; name: string; price: number | null; stock: number; active: boolean; image_url?: string | null; thumb_url?: string | null }[]
  }
  config: ProductSectionConfig
  currency: string
  lowStockThreshold: number
  whatsappNumber: string | null
  themeConfig: ThemeConfig
  promoBadge?: string | null
}) {
  const { addItem } = useCart()
  const toast = useToast()
  const galleryRight = (config.layout ?? 'gallery-left') === 'gallery-right'
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [added, setAdded] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
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

  // Gallery = product photos + variant photos (deduped). A variant's photo is
  // shown and highlighted when that variant is selected.
  const galleryImages = useMemo<GalleryImage[]>(() => {
    const base = product.images.map((img) => ({ public_url: img.public_url, thumb_url: img.thumb_url ?? null, id: img.id, variantId: null as string | null }))
    const variantImgs = variants
      .filter((v) => v.image_url && !base.some((b) => b.public_url === v.image_url))
      .map((v) => ({ public_url: v.image_url!, thumb_url: v.thumb_url ?? v.image_url ?? null, id: v.id, variantId: v.id }))
    return [...base, ...variantImgs]
  }, [product.images, variants])
  if (activeImage >= galleryImages.length) setActiveImage(0)

  // Selecting a variant with its own photo shows that photo; clicking a
  // variant's thumbnail in the gallery selects the variant.
  useEffect(() => {
    if (!variant?.image_url) return
    const idx = galleryImages.findIndex((g) => g.variantId === variant.id)
    if (idx >= 0 && activeImage !== idx) {
      setActiveImage(idx)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant?.id, variant?.image_url])

  // Carrousel auto : défile toutes les 4 s quand il y a plusieurs photos.
  // En pause au survol / focus, 10 s après une navigation manuelle, dans la
  // lightbox, ou si le visiteur préfère moins d'animations — avec un bouton
  // pause/lecture explicite pour l'accessibilité.
  const AUTOPLAY_MS = 4000
  const [autoplayOn, setAutoplayOn] = useState(true)
  const [hoverPaused, setHoverPaused] = useState(false)
  const [cooldown, setCooldown] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const resumeTimeout = useRef<number | null>(null)
  const touchStartX = useRef<number | null>(null)
  const lastSwipeAt = useRef(0)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  useEffect(
    () => () => {
      if (resumeTimeout.current !== null) window.clearTimeout(resumeTimeout.current)
    },
    [],
  )
  const manualGo = useCallback(
    (index: number) => {
      if (galleryImages.length === 0) return
      setActiveImage(((index % galleryImages.length) + galleryImages.length) % galleryImages.length)
      setCooldown(true)
      if (resumeTimeout.current !== null) window.clearTimeout(resumeTimeout.current)
      resumeTimeout.current = window.setTimeout(() => setCooldown(false), 10000)
    },
    [galleryImages.length],
  )
  const canAutoplay =
    galleryImages.length > 1 && autoplayOn && !hoverPaused && !cooldown && !reducedMotion && !lightboxOpen
  useEffect(() => {
    if (!canAutoplay) return
    const id = window.setInterval(() => {
      if (document.hidden) return
      setActiveImage((i) => (i + 1) % galleryImages.length)
    }, AUTOPLAY_MS)
    return () => window.clearInterval(id)
  }, [canAutoplay, galleryImages.length])
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current
    touchStartX.current = null
    if (start == null) return
    const dx = e.changedTouches[0].clientX - start
    if (Math.abs(dx) > 40) {
      lastSwipeAt.current = Date.now()
      manualGo(activeImage + (dx < 0 ? 1 : -1))
    }
  }
  const handleSlideClick = () => {
    // Un swipe termine par un clic : on l'ignore pour ne pas ouvrir la lightbox.
    if (Date.now() - lastSwipeAt.current < 500) return
    if (galleryImages.length > 0) setLightboxOpen(true)
  }
  const handleGalleryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') manualGo(activeImage + 1)
    else if (e.key === 'ArrowLeft') manualGo(activeImage - 1)
  }
  const selectImageAndVariant = (i: number) => {
    manualGo(i)
    // Cliquer la vignette d'une variante sélectionne la variante.
    const img = galleryImages[i]
    if (img?.variantId) {
      const variantIdx = variants.findIndex((v) => v.id === img.variantId)
      if (variantIdx >= 0) setSelectedVariant(variantIdx)
    }
  }

  const optionFields = useMemo(() => parseOptionFields(product.option_fields), [product.option_fields])
  const [optionValues, setOptionValues] = useState<Record<string, string>>({})
  const [optionError, setOptionError] = useState<{ fieldId: string; message: string } | null>(null)
  const setOptionValue = (fieldId: string, value: string) => {
    setOptionValues((prev) => ({ ...prev, [fieldId]: value }))
    setOptionError((prev) => (prev?.fieldId === fieldId ? null : prev))
  }

  const displayPrice = effectivePrice(product, variant)
  const displayStock = hasVariants && variant ? variant.stock : product.stock
  const outOfStock = displayStock <= 0

  useEffect(() => {
    trackEvent('view_item', { product_id: product.id, product_name: product.name, value: displayPrice, currency })
  }, [currency, displayPrice, product.id, product.name])

  const handleShare = () => {
    // Partage WhatsApp d'abord (canal n°1 en Afrique de l'Ouest) : ouvre le
    // sélecteur de contact avec le message déjà rempli. Le partage système
    // reste disponible via le navigateur (URL copiable dans la barre).
    const text = `Découvre ${product.name} (${formatPrice(displayPrice, currency, shop.tax_display)}) : ${window.location.href}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    trackEvent('share', { content_type: 'product', product_id: product.id, method: 'whatsapp' })
  }

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
    let selectedOptions: SelectedOption[] | undefined
    if (optionFields.length > 0) {
      const result = resolveSelection(optionFields, optionValues)
      if (!result.ok) {
        setOptionError({ fieldId: result.fieldId, message: result.error })
        toast.error(result.error)
        const el = document.querySelector<HTMLElement>(`[data-option-field="${CSS.escape(result.fieldId)}"]`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el?.querySelector<HTMLElement>('input, button')?.focus({ preventScroll: true })
        return
      }
      setOptionError(null)
      selectedOptions = result.options
    }
    addItem({
      options: selectedOptions,
      productId: product.id,
      variantId: variant?.id,
      variantName: variant?.name,
      name: product.name,
      slug: product.slug,
      price: displayPrice,
      quantity,
      // The photo the customer is actually looking at, not always the first
      // one — otherwise the cart/checkout thumbnail "changes" on them. The
      // cart shows a tiny thumbnail, so prefer the 400px version.
      imageUrl: variant?.thumb_url ?? variant?.image_url ?? galleryImages[activeImage]?.thumb_url ?? galleryImages[activeImage]?.public_url ?? galleryImages[0]?.thumb_url ?? galleryImages[0]?.public_url ?? null,
      stock: displayStock,
    })
    trackEvent('add_to_cart', { product_id: product.id, product_name: product.name, value: displayPrice * quantity, currency })
    setAdded(true)
    toast.success(`« ${product.name} » ajouté au panier.`)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <>
      <div className="mx-auto max-w-[var(--shop-content-width)] px-4 py-8 sm:px-6">
        <nav className="mb-6 flex flex-wrap items-center gap-y-1 break-words text-xs font-medium uppercase tracking-wide text-[var(--shop-text)]/40">
          <Link to="/catalogue" className="hover:text-[var(--shop-text)]">Catalogue</Link>
          {product.category && (
            <>
              <span className="mx-1.5 shrink-0">/</span>
              <Link to={`/catalogue?categorie=${product.category.slug}`} className="min-w-0 break-words hover:text-[var(--shop-text)]">{product.category.name}</Link>
            </>
          )}
        </nav>

        <div className={`grid gap-10 md:gap-14 ${galleryRight ? 'md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]' : 'md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'}`}>
          {config.showGallery && (
            <div className={galleryRight ? 'md:order-2' : undefined}>
              {galleryImages.length === 0 ? (
                <div
                  className="flex aspect-[4/5] w-full items-center justify-center bg-sand-100"
                  style={{ borderRadius: 'var(--shop-radius)' }}
                >
                  <div className="flex h-full w-full items-center justify-center text-ink-200">
                    <ImageOff size={48} aria-hidden />
                  </div>
                </div>
              ) : (
                <div
                  className="group/gallery relative"
                  onMouseEnter={() => setHoverPaused(true)}
                  onMouseLeave={() => setHoverPaused(false)}
                  onFocus={() => setHoverPaused(true)}
                  onBlur={() => setHoverPaused(false)}
                  onKeyDown={handleGalleryKeyDown}
                >
                  <div
                    className="overflow-hidden bg-sand-100"
                    style={{ borderRadius: 'var(--shop-radius)' }}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                  >
                    <div
                      className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
                      style={{ transform: `translateX(-${activeImage * 100}%)` }}
                      role="group"
                      aria-roledescription="carrousel"
                      aria-label={`Photos de ${product.name} — photo ${activeImage + 1} sur ${galleryImages.length}`}
                    >
                      {galleryImages.map((img, i) => (
                        <button
                          key={`${img.id}-${img.public_url}`}
                          type="button"
                          onClick={handleSlideClick}
                          aria-label={`Agrandir la photo ${i + 1} de ${product.name}`}
                          aria-hidden={i !== activeImage}
                          tabIndex={i === activeImage ? 0 : -1}
                          className="relative aspect-[4/5] w-full shrink-0 overflow-hidden"
                        >
                          <FadeImage
                            src={img.public_url}
                            alt={i === activeImage ? product.name : ''}
                            fetchPriority={i === 0 ? 'high' : undefined}
                            loading={i === 0 ? undefined : 'lazy'}
                            decoding="async"
                            srcSet={thumbSrcSet(img.thumb_url, img.public_url)}
                            sizes="(max-width: 768px) 100vw, 640px"
                            className={`h-full w-full object-cover ${outOfStock ? 'opacity-60 grayscale' : ''}`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  {galleryImages.length > 1 && (
                    <span
                      className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white"
                      aria-hidden
                    >
                      {activeImage + 1} / {galleryImages.length}
                    </span>
                  )}
                  <div className="absolute right-3 top-3 flex gap-2">
                    {galleryImages.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (resumeTimeout.current !== null) window.clearTimeout(resumeTimeout.current)
                          setCooldown(false)
                          setAutoplayOn((on) => !on)
                        }}
                        aria-label={autoplayOn ? 'Mettre le défilement auto en pause' : 'Relancer le défilement auto'}
                        aria-pressed={autoplayOn}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-[var(--shop-text)] transition-opacity sm:opacity-0 sm:group-hover/gallery:opacity-100 sm:focus-visible:opacity-100"
                      >
                        {autoplayOn ? <Pause size={14} aria-hidden /> : <Play size={14} aria-hidden />}
                      </button>
                    )}
                    <span className="pointer-events-none flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-[var(--shop-text)] transition-opacity sm:opacity-0 sm:group-hover/gallery:opacity-100">
                      <ZoomIn size={16} aria-hidden />
                    </span>
                  </div>
                  {galleryImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          manualGo(activeImage - 1)
                        }}
                        aria-label="Photo précédente"
                        className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[var(--shop-text)] shadow-sm transition hover:bg-white"
                      >
                        <ChevronLeft size={20} aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          manualGo(activeImage + 1)
                        }}
                        aria-label="Photo suivante"
                        className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[var(--shop-text)] shadow-sm transition hover:bg-white"
                      >
                        <ChevronRight size={20} aria-hidden />
                      </button>
                      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5" role="tablist" aria-label="Choisir une photo">
                        {galleryImages.map((img, i) => (
                          <button
                            key={`${img.id}-dot`}
                            type="button"
                            role="tab"
                            aria-selected={i === activeImage}
                            aria-label={`Photo ${i + 1}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              selectImageAndVariant(i)
                            }}
                            className={`h-1.5 rounded-full transition-all ${i === activeImage ? 'w-5 bg-white' : 'w-1.5 bg-white/60 hover:bg-white/90'}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
              {galleryImages.length > 1 && (
                <div className="mt-4 flex gap-3 overflow-x-auto pb-1" role="tablist" aria-label={`Photos de ${product.name}`}>
                  {galleryImages.map((img, i) => (
                    <button
                      key={`${img.id}-${img.public_url}`}
                      role="tab"
                      aria-selected={i === activeImage}
                      onClick={() => selectImageAndVariant(i)}
                      className={`h-16 w-16 shrink-0 overflow-hidden border-b-2 transition-colors ${i === activeImage ? 'border-[var(--shop-button)]' : 'border-transparent opacity-50 hover:opacity-100'}`}
                    >
                      <FadeImage src={img.thumb_url ?? img.public_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className={`md:pt-2 ${galleryRight ? 'md:order-1' : ''}`}>
            {promoBadge && (
              <p className="mb-2">
                <span className="inline-block rounded-full bg-[var(--shop-accent)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--shop-button-text)]">
                  {promoBadge}
                </span>
              </p>
            )}
            {product.category && config.showTitle && (
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--shop-text)]/40">{product.category.name}</p>
            )}
            {config.showTitle && (
              <h1
                className={`mt-2 font-heading font-bold tracking-tight text-[var(--shop-text)] ${sectionHeadingClass(themeConfig)}`}
                style={resolveTextStyle(config.headingStyle)}
              >
                {product.name}
              </h1>
            )}
            {config.showPrice && (
              <p className="mt-4 text-xl font-semibold text-[var(--shop-text)]">
                {formatPrice(displayPrice, currency, shop.tax_display)}
              </p>
            )}
            {hasVariants && (
              <div className="mt-4">
                <p className="text-sm font-medium text-[var(--shop-text)]">Choisissez une variante</p>
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
                        style={{ borderRadius: 'var(--shop-radius)' }}
                        className={`border px-4 py-2 text-sm transition-colors ${
                          isSelected
                            ? 'border-[var(--shop-button)] bg-[var(--shop-button)] text-[var(--shop-button-text)]'
                            : 'border-[var(--shop-secondary-button-text)]/20 text-[var(--shop-secondary-button-text)] hover:border-[var(--shop-secondary-button-text)]/50'
                        } ${soldOut ? 'cursor-not-allowed opacity-40' : ''}`}
                      >
                        <span className="block">{v.name}</span>
                        {soldOut && <span className="mt-0.5 block text-[10px] opacity-70">Épuisé</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {optionFields.length > 0 && (
              <div className="mt-4 space-y-4">
                {optionFields.map((field) => {
                  const value = optionValues[field.id] ?? ''
                  const error = optionError?.fieldId === field.id ? optionError.message : null
                  const labelId = `opt-label-${field.id}`
                  return (
                    <div key={field.id} data-option-field={field.id}>
                      <p id={labelId} className="text-sm font-medium text-[var(--shop-text)]">
                        {field.label}
                        {field.required ? (
                          <span className="ml-1 text-xs font-normal text-[var(--shop-text)]/50">* (obligatoire)</span>
                        ) : null}
                      </p>
                      {field.type === 'choice' ? (
                        <div role="radiogroup" aria-labelledby={labelId} className="mt-2 flex flex-wrap gap-2">
                          {field.choices.map((choice) => {
                            const isSelected = value === choice
                            return (
                              <button
                                key={choice}
                                type="button"
                                role="radio"
                                aria-checked={isSelected}
                                onClick={() => setOptionValue(field.id, isSelected && !field.required ? '' : choice)}
                                style={{ borderRadius: 'var(--shop-radius)' }}
                                className={`border px-4 py-2 text-sm transition-colors ${
                                  isSelected
                                    ? 'border-[var(--shop-button)] bg-[var(--shop-button)] text-[var(--shop-button-text)]'
                                    : 'border-[var(--shop-secondary-button-text)]/20 text-[var(--shop-secondary-button-text)] hover:border-[var(--shop-secondary-button-text)]/50'
                                }`}
                              >
                                {choice}
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={value}
                          maxLength={MAX_OPTION_TEXT_LENGTH}
                          placeholder="Votre réponse"
                          aria-labelledby={labelId}
                          aria-invalid={error ? true : undefined}
                          onChange={(e) => setOptionValue(field.id, e.target.value)}
                          style={{ borderRadius: 'var(--shop-radius)' }}
                          className="mt-2 w-full border border-[var(--shop-text)]/20 bg-transparent px-4 py-2 text-sm text-[var(--shop-text)] placeholder:text-[var(--shop-text)]/40 focus:border-[var(--shop-button)] focus:outline-none"
                        />
                      )}
                      {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
                    </div>
                  )
                })}
              </div>
            )}
            <div className="mt-2">
              <StockBadge stock={displayStock} lowStockThreshold={lowStockThreshold} />
            </div>
            {config.showDescription && product.description && (
              <p className="mt-6 break-words whitespace-pre-line leading-relaxed text-[var(--shop-text)]/70">{product.description}</p>
            )}

            {config.showQuantity && (
              <div className="mt-8 flex items-center gap-6">
                <div className="flex items-center gap-4">
                  <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={outOfStock} aria-label="Diminuer la quantité" className="-mx-2 flex h-10 w-10 items-center justify-center text-[var(--shop-text)]/70 hover:text-[var(--shop-text)] disabled:opacity-30"><Minus size={16} aria-hidden /></button>
                  <span className="w-4 text-center text-sm font-semibold text-[var(--shop-text)]">{quantity}</span>
                  <button onClick={() => setQuantity((q) => Math.min(displayStock, q + 1))} disabled={outOfStock || quantity >= displayStock} aria-label="Augmenter la quantité" className="-mx-2 flex h-10 w-10 items-center justify-center text-[var(--shop-text)]/70 hover:text-[var(--shop-text)] disabled:opacity-30"><Plus size={16} aria-hidden /></button>
                </div>
              </div>
            )}

            {config.showAddToCart && (
              <div ref={ctaSentinelRef}>
                <button
                  onClick={handleAddToCart}
                  disabled={outOfStock}
                  style={{ borderRadius: 'var(--shop-radius)' }}
                  className="mt-4 flex w-full items-center justify-center gap-2 bg-[var(--shop-button)] px-6 py-4 text-sm font-semibold uppercase tracking-widest text-[var(--shop-button-text)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-sand-200 disabled:text-ink-700/40"
                >
                  {outOfStock ? 'Rupture de stock' : added ? <><Check size={16} aria-hidden /> Ajouté</> : 'Ajouter au panier'}
                </button>
              </div>
            )}
            <div className={`mt-3 grid gap-3 ${whatsappNumber ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <button
                type="button"
                onClick={handleShare}
                style={{ borderRadius: 'var(--shop-radius)' }}
                className="flex items-center justify-center gap-1.5 border border-[var(--shop-secondary-button-text)]/20 px-3 py-3 text-xs font-semibold text-[var(--shop-secondary-button-text)] transition-colors hover:border-[var(--shop-secondary-button-text)]"
              >
                <Share2 size={15} aria-hidden /> Partager
              </button>
              {whatsappNumber && (
                <a
                  href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`À propos de « ${product.name} » : je voudrais en savoir plus.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ borderRadius: 'var(--shop-radius)' }}
                  className="flex items-center justify-center gap-1.5 border border-[var(--shop-secondary-button-text)]/20 px-3 py-3 text-xs font-semibold text-[var(--shop-secondary-button-text)] transition-colors hover:border-[var(--shop-secondary-button-text)]"
                >
                  <MessageCircle size={15} aria-hidden /> Question ?
                </a>
              )}
            </div>
            <div aria-live="polite">
              {added && (
                <Link to="/panier" className="mt-3 inline-block text-sm font-medium text-[var(--shop-text)] underline underline-offset-2">
                  Voir le panier →
                </Link>
              )}
            </div>

            {config.showTrustBadges !== false && <DeliveryPaymentInfo shop={shop} className="mt-5" />}
          </div>
        </div>
      </div>

      {config.showAddToCart && !ctaVisible && (
        <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 flex items-center justify-between gap-3 border-t border-[var(--shop-text)]/10 bg-[var(--shop-bg)] px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] sm:hidden">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-[var(--shop-text)]/60">{product.name}</p>
            <p className="text-sm font-bold text-[var(--shop-text)]">{formatPrice(displayPrice, currency, shop.tax_display)}</p>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={outOfStock}
            style={{ borderRadius: 'var(--shop-radius)' }}
            className="shrink-0 bg-[var(--shop-button)] px-5 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--shop-button-text)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-sand-200 disabled:text-ink-700/40"
          >
            {outOfStock ? 'Rupture' : added ? 'Ajouté ✓' : 'Ajouter'}
          </button>
        </div>
      )}

      {lightboxOpen && galleryImages.length > 0 && (
        <ImageLightbox
          images={galleryImages}
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
  themeConfig,
}: {
  shop: Shop
  categoryId: string | null
  excludeProductId: string
  themeConfig: ThemeConfig
}) {
  const { data: related } = useRelatedProducts(shop.id, categoryId, excludeProductId, 4)
  const { data: promos } = useActiveShopPromos(shop.id)
  if (!related || related.length === 0) return null

  return (
    <section className="mx-auto max-w-[var(--shop-content-width)] border-t border-[var(--shop-text)]/10 px-4 py-10 sm:px-6">
      <h2 className={`font-heading font-bold text-[var(--shop-text)] ${sectionHeadingClass(themeConfig)}`}>Vous aimerez aussi</h2>
      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 sm:gap-x-6">
        {related.map((product) => (
          <ProductCard key={product.id} product={product} currency={shop.currency} taxDisplay={shop.tax_display} lowStockThreshold={shop.low_stock_threshold} promoBadge={badgeForProduct(promos ?? [], product)} />
        ))}
      </div>
    </section>
  )
}

/** Client-only "vu récemment" row, backed by localStorage — never shows the
 *  product currently being viewed, and stays empty until there's history. */
function RecentlyViewedRow({ shop, product, themeConfig }: { shop: Shop; product: ProductWithRelations; themeConfig: ThemeConfig }) {
  const currentEntry = useMemo<RecentlyViewedEntry>(
    () => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      imageUrl: product.images[0]?.thumb_url ?? product.images[0]?.public_url ?? null,
    }),
    [product.id, product.slug, product.name, product.price, product.images],
  )
  const items = useRecentlyViewed(currentEntry)
  if (items.length === 0) return null

  return (
    <section className="mx-auto max-w-[var(--shop-content-width)] border-t border-[var(--shop-text)]/10 px-4 py-10 sm:px-6">
      <h2 className={`font-heading font-bold text-[var(--shop-text)] ${sectionHeadingClass(themeConfig)}`}>Vu récemment</h2>
      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 sm:gap-x-6">
        {items.map((item) => (
          <Link key={item.id} to={`/produits/${item.slug}`} className="group block">
            <div className="aspect-[4/5] w-full overflow-hidden bg-sand-100" style={{ borderRadius: 'var(--shop-radius)' }}>
              {item.imageUrl ? (
                <FadeImage
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
            <p className="mt-3 truncate text-sm text-[var(--shop-text)] group-hover:underline group-hover:decoration-[var(--shop-text)]/40 group-hover:underline-offset-2">
              {item.name}
            </p>
            <p className="text-sm font-semibold text-[var(--shop-text)]">{formatPrice(item.price, shop.currency, shop.tax_display)}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}

export function ProductRenderer({ shop, config, themeConfig }: { shop: Shop; config: ProductSectionConfig; themeConfig: ThemeConfig }) {
  const { slug } = useParams<{ slug: string }>()
  const isEmbeddedPreview = useIsEmbeddedPreview()
  const { data: product, isLoading, isError } = useProduct(shop?.id, slug)
  const { data: promos } = useActiveShopPromos(shop?.id)
  const currency = shop.currency ?? 'XOF'

  if (!slug) {
    if (isEmbeddedPreview) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center text-[var(--shop-text)]/50">
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
        <p className="text-[var(--shop-text)]/80">Ce produit n'existe pas ou n'est plus disponible.</p>
        <Link to="/catalogue" className="mt-4 inline-block text-sm font-medium text-[var(--shop-text)] underline underline-offset-2">
          Retour au catalogue
        </Link>
      </div>
    )
  }

  return (
    <>
      <ProductDetails
        shop={shop}
        product={product}
        config={config}
        currency={currency}
        lowStockThreshold={shop.low_stock_threshold}
        whatsappNumber={shop.whatsapp_number}
        themeConfig={themeConfig}
        promoBadge={badgeForProduct(promos ?? [], { id: product.id, category: product.category_id ? { id: product.category_id } : null })}
      />
      {config.showRelatedProducts !== false && (
        <RelatedProducts shop={shop} categoryId={product.category_id} excludeProductId={product.id} themeConfig={themeConfig} />
      )}
      {config.showRecentlyViewed !== false && <RecentlyViewedRow shop={shop} product={product} themeConfig={themeConfig} />}
    </>
  )
}

const PRODUCT_LAYOUTS: { value: ProductLayout; label: string; preview: React.ReactNode }[] = [
  {
    value: 'gallery-left',
    label: 'Galerie à gauche',
    preview: (
      <SwatchFrame className="items-center gap-1">
        <SwatchBlock className="h-full w-2/5" />
        <span className="flex w-3/5 flex-col gap-1">
          <SwatchBar />
          <SwatchBar w="w-2/3" />
        </span>
      </SwatchFrame>
    ),
  },
  {
    value: 'gallery-right',
    label: 'Galerie à droite',
    preview: (
      <SwatchFrame className="items-center gap-1">
        <span className="flex w-3/5 flex-col gap-1">
          <SwatchBar />
          <SwatchBar w="w-2/3" />
        </span>
        <SwatchBlock className="h-full w-2/5" />
      </SwatchFrame>
    ),
  },
]

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
        <label className={editorLabelClass}>Disposition</label>
        <div className="mt-1">
          <VisualPicker
            columns={2}
            value={config.layout ?? 'gallery-left'}
            onChange={(layout) => onChange({ ...config, layout })}
            options={PRODUCT_LAYOUTS}
          />
        </div>
        <p className={`mt-1.5 ${editorHelpClass}`}>Place la galerie à gauche ou à droite des informations (sur ordinateur).</p>
      </div>
      <div>
        <label className={editorLabelClass}>Titre (superposé)</label>
        <input value={config.heading} onChange={(e) => onChange({ ...config, heading: e.target.value })} className={editorInputClass} />
        <p className={`mt-1 ${editorHelpClass}`}>Le titre affiché est le nom du produit ; le style ci-dessous s'y applique.</p>
        <TextStyleField value={config.headingStyle} onChange={(headingStyle) => onChange({ ...config, headingStyle })} />
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
