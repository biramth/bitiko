import { useState } from 'react'
import { Check, ImageOff, Search, Star } from 'lucide-react'
import { useFeaturedProducts, useShopProducts } from '@/features/products/useProducts'
import { ProductCard } from '@/features/products/ProductCard'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Shop } from '@/types'
import type { FeaturedProductsSectionConfig } from '@/types/builder'
import { editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'

export function FeaturedProductsRenderer({ shop, config }: { shop: Shop; config: FeaturedProductsSectionConfig }) {
  const { data: products = [] } = useFeaturedProducts(shop.id, config.productIds)
  if (products.length === 0) return null

  return (
    <section className="mx-auto max-w-[var(--shop-content-width)] px-4 py-6 sm:px-6">
      <h2 className="mb-6 font-heading text-lg font-bold text-[var(--shop-text)]">{config.heading || 'Sélection'}</h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} currency={shop.currency} lowStockThreshold={shop.low_stock_threshold} />
        ))}
      </div>
    </section>
  )
}

export function FeaturedProductsEditor({
  config,
  onChange,
  shopId,
}: SectionEditorProps<FeaturedProductsSectionConfig>) {
  const [search, setSearch] = useState('')
  const { data: result, isLoading } = useShopProducts(shopId, { search: search || undefined })
  const products = result?.products ?? []

  const toggle = (id: string) => {
    const selected = config.productIds.includes(id)
    onChange({
      ...config,
      productIds: selected ? config.productIds.filter((p) => p !== id) : [...config.productIds, id],
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className={editorLabelClass}>Titre</label>
        <input
          value={config.heading}
          onChange={(e) => onChange({ ...config, heading: e.target.value })}
          className={editorInputClass}
        />
      </div>

      <div>
        <span className={editorLabelClass}>Produits sélectionnés ({config.productIds.length})</span>
        <div className="relative mt-1.5">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit…"
            className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-sm focus:border-brand-400 focus:outline-none"
          />
        </div>

        <div className="mt-2 max-h-72 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-1.5">
          {isLoading && <p className="px-2 py-3 text-sm text-gray-400">Chargement…</p>}
          {!isLoading && products.length === 0 && (
            <EmptyState icon={Star} title="Aucun produit trouvé" />
          )}
          {products.map((product) => {
            const selected = config.productIds.includes(product.id)
            const cover = product.images[0]?.public_url
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => toggle(product.id)}
                className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm ${
                  selected ? 'bg-brand-50' : 'hover:bg-gray-50'
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-sand-100">
                  {cover ? (
                    <img src={cover} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageOff size={14} className="text-gray-300" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-gray-900">{product.name}</span>
                {selected && <Check size={15} className="shrink-0 text-brand-600" aria-hidden />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
