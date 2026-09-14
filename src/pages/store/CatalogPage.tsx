import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PackageSearch, Search } from 'lucide-react'
import { useTenant } from '@/features/tenant/TenantContext'
import { useCategories } from '@/features/categories/useCategories'
import { useActiveProducts } from '@/features/products/useProducts'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { ProductCard } from '@/features/products/ProductCard'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { EmptyState } from '@/components/ui/EmptyState'
import { PRODUCTS_PAGE_SIZE } from '@/config/constants'
import type { ProductFilters } from '@/services/product.service'
import { usePageSeo } from '@/hooks/usePageSeo'

export function CatalogPage() {
  const { shop } = useTenant()
  usePageSeo({ title: shop ? `Catalogue — ${shop.name}` : 'Catalogue' })
  const { data: categories } = useCategories(shop?.id)
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState(searchParams.get('recherche') ?? '')
  const search = useDebouncedValue(searchInput, 300)
  const [page, setPage] = useState(1)

  const categorySlug = searchParams.get('categorie') ?? ''
  const sort = (searchParams.get('tri') as ProductFilters['sort']) ?? 'recent'
  const selectedCategory = categories?.find((c) => c.slug === categorySlug)

  const { data: result, isLoading, isError } = useActiveProducts(
    shop
      ? {
          shopId: shop.id,
          search: search || undefined,
          categoryId: selectedCategory?.id,
          sort,
          page,
        }
      : null,
  )

  const totalPages = result ? Math.max(1, Math.ceil(result.total / PRODUCTS_PAGE_SIZE)) : 1

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold text-gray-900">Catalogue</h1>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value)
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev)
                if (e.target.value) next.set('recherche', e.target.value)
                else next.delete('recherche')
                return next
              })
              setPage(1)
            }}
            placeholder="Rechercher un produit…"
            aria-label="Rechercher un produit"
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-gray-400 focus:outline-none"
          />
        </div>

        <select
          value={categorySlug}
          onChange={(e) => {
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev)
              if (e.target.value) next.set('categorie', e.target.value)
              else next.delete('categorie')
              return next
            })
            setPage(1)
          }}
          aria-label="Filtrer par catégorie"
          className="rounded-lg border border-gray-200 py-2 px-3 text-sm focus:border-gray-400 focus:outline-none"
        >
          <option value="">Toutes les catégories</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => {
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev)
              next.set('tri', e.target.value)
              return next
            })
            setPage(1)
          }}
          aria-label="Trier les produits"
          className="rounded-lg border border-gray-200 py-2 px-3 text-sm focus:border-gray-400 focus:outline-none"
        >
          <option value="recent">Plus récents</option>
          <option value="price_asc">Prix croissant</option>
          <option value="price_desc">Prix décroissant</option>
        </select>
      </div>

      <div className="mt-8">
        {!isLoading && !isError && result && result.total > 0 && (
          <p className="mb-4 text-sm text-gray-500">
            {result.total} produit{result.total > 1 ? 's' : ''}
            {search ? ` pour « ${search} »` : ''}
          </p>
        )}
        {isLoading && <Spinner />}
        {isError && <ErrorMessage />}
        {!isLoading && !isError && (result?.products.length ?? 0) === 0 && (
          <EmptyState
            icon={PackageSearch}
            title="Aucun produit trouvé"
            description="Essayez une autre recherche ou catégorie."
          />
        )}
        {!isLoading && (result?.products.length ?? 0) > 0 && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {result!.products.map((product) => (
                <ProductCard key={product.id} product={product} currency={shop?.currency ?? 'XOF'} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`h-9 w-9 rounded-full text-sm font-medium ${
                      p === page ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
