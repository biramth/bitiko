import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PackageSearch, Search } from 'lucide-react'
import { useActiveProducts } from '@/features/products/useProducts'
import { useCategories } from '@/features/categories/useCategories'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { ProductCard } from '@/features/products/ProductCard'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { EmptyState } from '@/components/ui/EmptyState'
import { PRODUCTS_PAGE_SIZE } from '@/config/constants'
import type { ProductFilters } from '@/services/product.service'
import type { Shop } from '@/types'
import type { ProductsSectionConfig } from '@/types/builder'
import { editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'

export function ProductsRenderer({ shop, config }: { shop: Shop; config: ProductsSectionConfig }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState(() => searchParams.get('q') ?? '')
  const search = useDebouncedValue(searchInput, 300)
  const { data: categories } = useCategories(shop.id)

  // The catalogue template's toolbar drives search / category / pagination via
  // the URL (same as the legacy CatalogPage); a simple "Produits" block ignores
  // all of it and just shows `config.limit` items.
  const fullToolbox = config.enableFilters === true
  const categorySlug = fullToolbox ? (searchParams.get('categorie') ?? '') : ''
  const categoryId = fullToolbox ? categories?.find((c) => c.slug === categorySlug)?.id : undefined
  const sort = (fullToolbox ? (searchParams.get('tri') as ProductFilters['sort']) : config.sort) ?? config.sort
  const page = fullToolbox ? Math.max(1, Number(searchParams.get('page')) || 1) : 1

  const { data: result, isLoading, isError } = useActiveProducts({
    shopId: shop.id,
    sort,
    page,
    search: fullToolbox ? (search || undefined) : undefined,
    categoryId: fullToolbox ? categoryId : undefined,
  })
  const products = fullToolbox ? (result?.products ?? []) : (result?.products ?? []).slice(0, config.limit)
  const total = result?.total ?? products.length
  const totalPages = fullToolbox ? Math.max(1, Math.ceil(total / PRODUCTS_PAGE_SIZE)) : 1

  useEffect(() => {
    if (!fullToolbox) return
    const urlSearch = searchParams.get('q') ?? ''
    if (urlSearch === search) return
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (search) next.set('q', search)
        else next.delete('q')
        next.delete('page')
        return next
      },
      { replace: true },
    )
  }, [fullToolbox, search, searchParams, setSearchParams])

  const setParam = (key: string, value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  return (
    <section className="mx-auto max-w-[var(--shop-content-width)] px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 flex items-end justify-between border-b border-ink-900/10 pb-4">
        <h2 className="font-heading text-xl font-bold text-[var(--shop-text)] sm:text-2xl">{config.heading || 'Produits'}</h2>
        {!fullToolbox && products.length > 0 && (
          <Link to="/catalogue" className="text-xs font-semibold uppercase tracking-widest text-[var(--shop-text)] hover:opacity-60">
            Tout voir
          </Link>
        )}
      </div>

      {fullToolbox && (
        <div className="mb-8 flex flex-col gap-4 border-b border-ink-900/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="absolute left-0 top-1/2 -translate-y-1/2 text-ink-700/40" aria-hidden />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher un produit…"
              aria-label="Rechercher un produit"
              className="w-full border-b border-ink-900/15 bg-transparent py-2 pl-6 pr-3 text-sm text-ink-900 placeholder:text-ink-700/40 focus:border-ink-900 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-4">
            <select
              value={categorySlug}
              onChange={(e) => {
                setSearchInput('')
                setSearchParams(
                  (prev) => {
                    const next = new URLSearchParams(prev)
                    next.delete('q')
                    if (e.target.value) next.set('categorie', e.target.value)
                    else next.delete('categorie')
                    next.delete('page')
                    return next
                  },
                  { replace: true },
                )
              }}
              aria-label="Filtrer par catégorie"
              className="border-b border-ink-900/15 bg-transparent py-2 text-sm text-ink-900 focus:border-ink-900 focus:outline-none"
            >
              <option value="">Toutes les catégories</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>

            <select
              value={sort}
              onChange={(e) => setParam('tri', e.target.value)}
              aria-label="Trier les produits"
              className="border-b border-ink-900/15 bg-transparent py-2 text-sm text-ink-900 focus:border-ink-900 focus:outline-none"
            >
              <option value="recent">Plus récents</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
            </select>
          </div>
        </div>
      )}

      {!isLoading && !isError && fullToolbox && total > 0 && (
        <p className="mb-4 text-sm text-ink-700/60">
          {total} produit{total > 1 ? 's' : ''}
          {search ? ` pour « ${search} »` : ''}
        </p>
      )}

      {isLoading && <Spinner />}
      {isError && <ErrorMessage />}
      {!isLoading && !isError && products.length === 0 && (
        <EmptyState
          icon={PackageSearch}
          title={search ? 'Aucun produit trouvé' : 'Aucun produit pour le moment'}
          description={search ? `Aucun résultat pour « ${search} ».` : undefined}
        />
      )}
      {!isLoading && products.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} currency={shop.currency} lowStockThreshold={shop.low_stock_threshold} />
            ))}
          </div>

          {fullToolbox && totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setSearchParams((prev) => {
                    const next = new URLSearchParams(prev)
                    next.set('page', String(p))
                    return next
                  }, { replace: true })}
                  className={`h-9 w-9 text-sm font-medium transition-colors ${p === page ? 'bg-ink-900 text-white' : 'text-ink-700 hover:bg-sand-100'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}

export function ProductsEditor({ config, onChange }: SectionEditorProps<ProductsSectionConfig>) {
  return (
    <div className="space-y-4">
      <div>
        <label className={editorLabelClass}>Titre</label>
        <input value={config.heading} onChange={(e) => onChange({ ...config, heading: e.target.value })} className={editorInputClass} />
      </div>
      <div>
        <label className={editorLabelClass}>Tri</label>
        <select value={config.sort} onChange={(e) => onChange({ ...config, sort: e.target.value as ProductsSectionConfig['sort'] })} className={editorInputClass}>
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
          disabled={config.enableFilters === true}
          onChange={(e) => onChange({ ...config, limit: Math.max(1, Number(e.target.value) || 1) })}
          className={`${editorInputClass} disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400`}
        />
        {config.enableFilters === true && (
          <p className="mt-1 text-xs text-gray-400">Ignoré quand les outils de catalogue sont activés (pagination à la place).</p>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={config.enableFilters === true}
          onChange={(e) => onChange({ ...config, enableFilters: e.target.checked })}
          className="accent-brand-600"
        />
        Outils de catalogue (recherche, catégories, tri, pagination)
      </label>
    </div>
  )
}