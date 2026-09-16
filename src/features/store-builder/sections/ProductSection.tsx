import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Check, ChevronLeft, ChevronRight, ImageOff, MessageCircle, Minus, Plus, Share2 } from 'lucide-react'
import { useActiveProducts, useProduct } from '@/features/products/useProducts'
import { ProductCard } from '@/features/products/ProductCard'
import { StockBadge } from '@/features/products/StockBadge'
import { useCart } from '@/features/cart/CartContext'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { trackEvent } from '@/lib/analytics'
import { formatCurrency } from '@/utils/format'
import { useIsEmbeddedPreview } from '../useEmbeddedPreview'
import type { Product, Shop } from '@/types'
import type { ProductSectionConfig } from '@/types/builder'
import { editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'

function ProductDetails({
  product,
  config,
  currency,
  lowStockThreshold,
  whatsappNumber,
}: {
  product: Product & {
    category?: { name: string; slug: string } | null
    images: { public_url: string; id: string }[]
    variants?: { id: string; name: string; price: number | null; stock: number; active: boolean }[]
  }
  config: ProductSectionConfig
  currency: string
  lowStockThreshold: number
  whatsappNumber: string | null
}) {
  const { addItem } = useCart()
  const toast = useToast()
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [added, setAdded] = useState(false)
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

  useEffect(() => {
    trackEvent('view_item', { product_id: product.id, product_name: product.name, value: displayPrice, currency })
  }, [currency, displayPrice, product.id, product.name])

  const handleShare = async () => {
    const shareData = { title: product.name, text: `Découvre ${product.name}`, url: window.location.href }
    try {
      if (navigator.share) {
        await navigator.share(shareData)
        trackEvent('share', { content_type: 'product', product_id: product.id })
      } else {
        await navigator.clipboard.writeText(window.location.href)
        trackEvent('share', { content_type: 'product', product_id: product.id, method: 'copy_link' })
        toast.success('Lien du produit copié.')
      }
    } catch {
      // The share sheet can be dismissed by the customer; that is not an error.
    }
  }

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
    trackEvent('add_to_cart', { product_id: product.id, product_name: product.name, value: displayPrice * quantity, currency })
    setAdded(true)
    toast.success(`« ${product.name} » ajouté au panier.`)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
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
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-sand-100">
              {images[activeImage] ? (
                <img src={images[activeImage].public_url} alt={product.name} className={`h-full w-full object-cover ${outOfStock ? 'opacity-60 grayscale' : ''}`} />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-ink-200"><ImageOff size={48} aria-hidden /></div>
              )}
              {images.length > 1 && (
                <>
                  <button type="button" onClick={() => setActiveImage((i) => (i - 1 + images.length) % images.length)} aria-label="Photo précédente" className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center bg-white/90 text-ink-900 shadow-sm backdrop-blur hover:bg-white">
                    <ChevronLeft size={18} aria-hidden />
                  </button>
                  <button type="button" onClick={() => setActiveImage((i) => (i + 1) % images.length)} aria-label="Photo suivante" className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center bg-white/90 text-ink-900 shadow-sm backdrop-blur hover:bg-white">
                    <ChevronRight size={18} aria-hidden />
                  </button>
                  <span className="absolute bottom-3 right-3 bg-black/60 px-2 py-1 text-xs font-medium text-white">
                    {activeImage + 1} / {images.length}
                  </span>
                </>
              )}
            </div>
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
                      <span className="block">{v.name}</span>
                      {soldOut && <span className="mt-0.5 block text-[10px] opacity-70">Épuisé</span>}
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
            <button onClick={handleAddToCart} disabled={outOfStock} className="sticky bottom-16 z-10 mt-4 flex w-full items-center justify-center gap-2 bg-[var(--shop-button)] px-6 py-4 text-sm font-semibold uppercase tracking-widest text-white shadow-lg shadow-black/10 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-sand-200 disabled:text-ink-700/40 md:static md:shadow-none">
              {outOfStock ? 'Rupture de stock' : added ? <><Check size={16} aria-hidden /> Ajouté</> : 'Ajouter au panier'}
            </button>
          )}
          <button type="button" onClick={handleShare} className="mt-3 flex w-full items-center justify-center gap-2 border border-ink-900/15 px-6 py-3 text-sm font-semibold text-ink-900 transition-colors hover:border-ink-900 hover:bg-sand-50">
            <Share2 size={16} aria-hidden /> Partager ce produit
          </button>
          {whatsappNumber && (
            <a
              href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Bonjour, je voudrais en savoir plus sur « ${product.name} ».`)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex w-full items-center justify-center gap-2 border border-emerald-600/30 px-6 py-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
            >
              <MessageCircle size={16} aria-hidden /> Poser une question sur WhatsApp
            </a>
          )}
          <div aria-live="polite">
            {added && (
              <Link to="/panier" className="mt-3 inline-block text-sm font-medium text-ink-900 underline underline-offset-2">
                Voir le panier →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ProductRenderer({ shop, config }: { shop: Shop; config: ProductSectionConfig }) {
  const { slug } = useParams<{ slug: string }>()
  const isEmbeddedPreview = useIsEmbeddedPreview()
  const { data: product, isLoading, isError } = useProduct(shop?.id, slug)
  const { data: relatedResult } = useActiveProducts(
    product?.category?.id ? { shopId: shop.id, categoryId: product.category.id, sort: 'recent', page: 1 } : null,
  )
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

  const relatedProducts = relatedResult?.products.filter((item) => item.id !== product.id).slice(0, 4) ?? []

  return (
    <>
      <ProductDetails
        product={product}
        config={config}
        currency={currency}
        lowStockThreshold={shop.low_stock_threshold}
        whatsappNumber={shop.whatsapp_number}
      />
      {relatedProducts.length > 0 && (
        <section className="mx-auto max-w-6xl border-t border-ink-900/10 px-4 py-10 sm:px-6 sm:py-14">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--shop-accent)]">À découvrir aussi</p>
              <h2 className="mt-2 font-heading text-xl font-bold text-[var(--shop-text)] sm:text-2xl">Dans la même sélection</h2>
            </div>
            <Link to={`/catalogue?categorie=${product.category?.slug ?? ''}`} className="text-xs font-semibold uppercase tracking-widest text-[var(--shop-text)] hover:opacity-60">
              Tout voir
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 sm:gap-x-6">
            {relatedProducts.map((item) => (
              <ProductCard key={item.id} product={item} currency={shop.currency} lowStockThreshold={shop.low_stock_threshold} />
            ))}
          </div>
        </section>
      )}
    </>
  )
}

export function ProductEditor({ config, onChange }: SectionEditorProps<ProductSectionConfig>) {
  const toggle = (key: keyof ProductSectionConfig) => onChange({ ...config, [key]: !config[key] })
  return (
    <div className="space-y-4">
      <div>
        <label className={editorLabelClass}>Titre (superposé)</label>
        <input value={config.heading} onChange={(e) => onChange({ ...config, heading: e.target.value })} className={editorInputClass} />
      </div>
      {(['showGallery', 'showTitle', 'showPrice', 'showDescription', 'showQuantity', 'showAddToCart'] as const).map((key) => (
        <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={!!config[key]} onChange={() => toggle(key)} className="accent-brand-600" />
          {{ showGallery: 'Galerie photos', showTitle: 'Titre', showPrice: 'Prix', showDescription: 'Description', showQuantity: 'Quantité', showAddToCart: 'Ajouter au panier' }[key]}
        </label>
      ))}
    </div>
  )
}
