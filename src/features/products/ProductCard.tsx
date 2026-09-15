import { Link } from 'react-router-dom'
import { ImageOff } from 'lucide-react'
import { formatCurrency } from '@/utils/format'
import { StockBadge } from './StockBadge'
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

  return (
    <Link to={`/produits/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-sand-100">
        {cover ? (
          <img
            src={cover}
            alt={product.name}
            loading="lazy"
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
      <div className="mt-3 flex flex-col gap-0.5">
        {product.category && (
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-700/40">{product.category.name}</p>
        )}
        <h3 className="text-sm text-ink-900 group-hover:underline group-hover:decoration-ink-900/40 group-hover:underline-offset-2">
          {product.name}
        </h3>
        <p className="text-sm font-semibold text-ink-900">{formatCurrency(product.price, currency)}</p>
        <StockBadge stock={product.stock} lowStockThreshold={lowStockThreshold} compact />
      </div>
    </Link>
  )
}
