import { Link } from 'react-router-dom'
import { PackageSearch } from 'lucide-react'
import { useActiveProducts } from '@/features/products/useProducts'
import { ProductCard } from '@/features/products/ProductCard'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Shop } from '@/types'
import type { ProductsSectionConfig } from '@/types/builder'
import { editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'

export function ProductsRenderer({ shop, config }: { shop: Shop; config: ProductsSectionConfig }) {
  const { data: result, isLoading, isError } = useActiveProducts({
    shopId: shop.id,
    sort: config.sort,
    page: 1,
  })
  const products = (result?.products ?? []).slice(0, config.limit)

  return (
    <section className="mx-auto max-w-[var(--shop-content-width)] px-4 py-6 sm:px-6">
      <div className="mb-6 flex items-center justify-between border-b border-ink-900/10 pb-4">
        <h2 className="font-heading text-lg font-bold text-[var(--shop-text)]">{config.heading || 'Produits'}</h2>
        {products.length > 0 && (
          <Link to="/catalogue" className="text-xs font-semibold uppercase tracking-widest text-[var(--shop-text)] hover:opacity-60">
            Tout voir
          </Link>
        )}
      </div>
      {isLoading && <Spinner />}
      {isError && <ErrorMessage />}
      {!isLoading && !isError && products.length === 0 && (
        <EmptyState icon={PackageSearch} title="Aucun produit pour le moment" />
      )}
      {!isLoading && products.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} currency={shop.currency} lowStockThreshold={shop.low_stock_threshold} />
          ))}
        </div>
      )}
    </section>
  )
}

export function ProductsEditor({ config, onChange }: SectionEditorProps<ProductsSectionConfig>) {
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
        <label className={editorLabelClass}>Tri</label>
        <select
          value={config.sort}
          onChange={(e) => onChange({ ...config, sort: e.target.value as ProductsSectionConfig['sort'] })}
          className={editorInputClass}
        >
          <option value="recent">Plus récents</option>
          <option value="price_asc">Prix croissant</option>
          <option value="price_desc">Prix décroissant</option>
        </select>
      </div>
      <div>
        <label className={editorLabelClass}>Nombre de produits affichés</label>
        <input
          type="number"
          min={1}
          max={48}
          value={config.limit}
          onChange={(e) => onChange({ ...config, limit: Math.max(1, Number(e.target.value) || 1) })}
          className={editorInputClass}
        />
      </div>
    </div>
  )
}
