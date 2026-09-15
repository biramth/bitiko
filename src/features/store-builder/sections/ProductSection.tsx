import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Check, ImageOff, Minus, Plus } from 'lucide-react'
import { useProduct } from '@/features/products/useProducts'
import { StockBadge } from '@/features/products/StockBadge'
import { useCart } from '@/features/cart/CartContext'
import { Spinner } from '@/components/ui/Spinner'
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
}: {
  product: Product & { category?: { name: string; slug: string } | null; images: { public_url: string; id: string }[] }
  config: ProductSectionConfig
  currency: string
  lowStockThreshold: number
}) {
  const { addItem } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [added, setAdded] = useState(false)
  const images = product.images
  const outOfStock = product.stock <= 0

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      quantity,
      imageUrl: images[0]?.public_url ?? null,
      stock: product.stock,
    })
    setAdded(true)
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
            <div className="aspect-[4/5] w-full overflow-hidden bg-sand-100">
              {images[activeImage] ? (
                <img src={images[activeImage].public_url} alt={product.name} className={`h-full w-full object-cover ${outOfStock ? 'opacity-60 grayscale' : ''}`} />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-ink-200"><ImageOff size={48} aria-hidden /></div>
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
              {formatCurrency(product.price, currency)}
            </p>
          )}
          <div className="mt-2">
            <StockBadge stock={product.stock} lowStockThreshold={lowStockThreshold} />
          </div>
          {config.showDescription && product.description && (
            <p className="mt-6 whitespace-pre-line leading-relaxed text-ink-700/70">{product.description}</p>
          )}

          {config.showQuantity && (
            <div className="mt-8 flex items-center gap-6">
              <div className="flex items-center gap-4">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={outOfStock} aria-label="Diminuer la quantité" className="text-ink-700 hover:text-ink-900 disabled:opacity-30"><Minus size={16} /></button>
                <span className="w-4 text-center text-sm font-semibold text-ink-900">{quantity}</span>
                <button onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))} disabled={outOfStock || quantity >= product.stock} aria-label="Augmenter la quantité" className="text-ink-700 hover:text-ink-900 disabled:opacity-30"><Plus size={16} /></button>
              </div>
            </div>
          )}

          {config.showAddToCart && (
            <button onClick={handleAddToCart} disabled={outOfStock} className="mt-4 flex w-full items-center justify-center gap-2 bg-[var(--shop-button)] px-6 py-4 text-sm font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-sand-200 disabled:text-ink-700/40">
              {outOfStock ? 'Rupture de stock' : added ? <><Check size={16} aria-hidden /> Ajouté</> : 'Ajouter au panier'}
            </button>
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
    <ProductDetails
      product={product}
      config={config}
      currency={currency}
      lowStockThreshold={shop.low_stock_threshold}
    />
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
          <input type="checkbox" checked={!!config[key]} onChange={() => toggle(key)} className="accent-[var(--shop-accent)]" />
          {{ showGallery: 'Galerie photos', showTitle: 'Titre', showPrice: 'Prix', showDescription: 'Description', showQuantity: 'Quantité', showAddToCart: 'Ajouter au panier' }[key]}
        </label>
      ))}
    </div>
  )
}
