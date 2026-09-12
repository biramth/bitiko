import { Link } from 'react-router-dom'
import { ImageOff } from 'lucide-react'
import { formatCurrency } from '@/utils/format'
import { StockBadge } from './StockBadge'
import type { ProductWithRelations } from '@/types'

export function ProductCard({
  product,
  currency,
}: {
  product: ProductWithRelations
  currency: string
}) {
  const cover = product.images[0]?.public_url

  return (
    <Link
      to={`/produits/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 transition-shadow hover:shadow-md"
    >
      <div className="aspect-square w-full overflow-hidden bg-gray-100">
        {cover ? (
          <img
            src={cover}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            <ImageOff size={32} aria-hidden />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-gray-900">{product.name}</h3>
        <p className="font-semibold text-gray-900">{formatCurrency(product.price, currency)}</p>
        <StockBadge stock={product.stock} />
      </div>
    </Link>
  )
}
