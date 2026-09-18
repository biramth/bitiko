import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ImageOff, Plus } from 'lucide-react'
import { formatCurrency } from '@/utils/format'
import { StockBadge } from './StockBadge'
import { useCart } from '@/features/cart/CartContext'
import { useToast } from '@/components/ui/Toast'
import { trackEvent } from '@/lib/analytics'
import { priceRange } from '@/utils/productPricing'
import type { ProductWithRelations } from '@/types'

export function ProductCard({
  product,
  currency,
  lowStockThreshold,
}: {
  product: ProductWithRelations
  currency: string
  lowStockThreshold?: number
}) {
  const cover = product.images[0]?.public_url
  const outOfStock = product.stock <= 0
  const hasVariants = product.variants.length > 0
  const { min, hasRange } = priceRange(product)
  const { addItem } = useCart()
  const toast = useToast()
  const [added, setAdded] = useState(false)

  const handleQuickAdd = () => {
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      quantity: 1,
      imageUrl: cover ?? null,
      stock: product.stock,
    })
    trackEvent('add_to_cart', { product_id: product.id, product_name: product.name, value: product.price, currency })
    setAdded(true)
    toast.success(`« ${product.name} » ajouté au panier.`)
    window.setTimeout(() => setAdded(false), 1800)
  }

  return (
    <article className="group relative">
      <Link to={`/produits/${product.slug}`} className="block">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-sand-100" style={{ borderRadius: 'var(--shop-radius)' }}>
        {cover ? (
          <img
            src={cover}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className={`h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] ${outOfStock ? 'opacity-50 grayscale' : ''}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-200">
            <ImageOff size={32} aria-hidden />
          </div>
        )}
        {outOfStock && (
          <span className="absolute left-3 top-3 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-900">
            Rupture
          </span>
        )}
      </div>
      </Link>
      <div className="mt-3 flex flex-col gap-0.5">
        {product.category && (
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--shop-text)]/40">{product.category.name}</p>
        )}
        <h3 className="text-sm text-[var(--shop-text)] group-hover:underline group-hover:decoration-[var(--shop-text)]/40 group-hover:underline-offset-2">
          {product.name}
        </h3>
        <p className="text-sm font-semibold text-[var(--shop-text)]">
          {hasRange && <span className="mr-1 text-xs font-normal opacity-70">À partir de</span>}
          {formatCurrency(min, currency)}
        </p>
        <StockBadge stock={product.stock} lowStockThreshold={lowStockThreshold} compact />
      </div>
      {!outOfStock && !hasVariants && (
        <button
          type="button"
          onClick={handleQuickAdd}
          style={{ borderRadius: 'var(--shop-radius)' }}
          className="mt-3 flex w-full items-center justify-center gap-1.5 border border-[var(--shop-text)]/15 py-2.5 text-xs font-semibold uppercase tracking-widest text-[var(--shop-text)] transition-colors hover:border-[var(--shop-button)] hover:bg-[var(--shop-button)] hover:text-white"
        >
          {added ? <><Check size={14} aria-hidden /> Ajouté</> : <><Plus size={14} aria-hidden /> Ajouter</>}
        </button>
      )}
      {!outOfStock && hasVariants && (
        <Link
          to={`/produits/${product.slug}`}
          style={{ borderRadius: 'var(--shop-radius)' }}
          className="mt-3 block border border-[var(--shop-text)]/15 py-2.5 text-center text-xs font-semibold uppercase tracking-widest text-[var(--shop-text)] transition-colors hover:border-[var(--shop-button)] hover:bg-[var(--shop-button)] hover:text-white"
        >
          Choisir une option
        </Link>
      )}
    </article>
  )
}
