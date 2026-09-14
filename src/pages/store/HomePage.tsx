import { Link } from 'react-router-dom'
import { ArrowRight, PackageSearch } from 'lucide-react'
import { useTenant } from '@/features/tenant/TenantContext'
import { useCategories } from '@/features/categories/useCategories'
import { useActiveProducts } from '@/features/products/useProducts'
import { ProductCard } from '@/features/products/ProductCard'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { EmptyState } from '@/components/ui/EmptyState'

export function HomePage() {
  const { shop } = useTenant()
  const { data: categories } = useCategories(shop?.id)
  const { data: productResult, isLoading: productsLoading, isError } = useActiveProducts(
    shop ? { shopId: shop.id, sort: 'recent', page: 1 } : null,
  )

  return (
    <div>
      <section className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            {shop?.name ?? 'Bienvenue dans notre boutique'}
          </h1>
          {shop?.description && (
            <p className="mx-auto mt-4 max-w-2xl text-gray-600">{shop.description}</p>
          )}
          <Link
            to="/catalogue"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-medium text-white hover:bg-brand-700"
          >
            Voir la boutique
            <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </section>

      {categories && categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Catégories</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/catalogue?categorie=${category.slug}`}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Produits récents</h2>
        {productsLoading && <Spinner />}
        {isError && <ErrorMessage />}
        {!productsLoading && !isError && (productResult?.products.length ?? 0) === 0 && (
          <EmptyState icon={PackageSearch} title="Aucun produit pour le moment" />
        )}
        {!productsLoading && (productResult?.products.length ?? 0) > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {productResult!.products.map((product) => (
              <ProductCard key={product.id} product={product} currency={shop?.currency ?? 'XOF'} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
