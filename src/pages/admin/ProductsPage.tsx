import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { ImageOff, Package, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { useCategories } from '@/features/categories/useCategories'
import { useShopPlan } from '@/features/billing/useShopPlan'
import { useShopProducts } from '@/features/products/useProducts'
import { deleteProductCompletely, updateProduct } from '@/services/product.service'
import { formatCurrency } from '@/utils/format'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { ADMIN_PRODUCTS_PAGE_SIZE } from '@/config/constants'
import { PLANS } from '@/config/plans'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { EmptyState } from '@/components/ui/EmptyState'
import { usePageSeo } from '@/hooks/usePageSeo'
import { PageHeader } from '@/components/ui/PageHeader'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ProductImportDialog } from './ProductImportDialog'
import type { ProductWithRelations } from '@/types'

const STOCK_FILTERS: { value: 'all' | 'low' | 'out'; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'low', label: 'Stock faible' },
  { value: 'out', label: 'Rupture' },
]

export function ProductsPage() {
  usePageSeo({ title: 'Produits — Bitiko', noindex: true })
  const { data: shop } = useMyShop()
  const { data: categories = [] } = useCategories(shop?.id)
  const { planKey } = useShopPlan(shop?.id)
  const queryClient = useQueryClient()
  const currency = shop?.currency ?? 'XOF'
  const lowStockThreshold = shop?.low_stock_threshold ?? 5

  const [searchParams, setSearchParams] = useSearchParams()
  const stockParam = searchParams.get('stock')
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 300)
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>(
    stockParam === 'low' || stockParam === 'out' ? stockParam : 'all',
  )
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<ProductWithRelations | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const { data, isLoading, isError } = useShopProducts(
    shop?.id,
    {
      search: search || undefined,
      stock: stockFilter === 'all' ? undefined : stockFilter,
      page,
    },
    lowStockThreshold,
  )

  const products = data?.products ?? []
  const totalPages = data ? Math.max(1, Math.ceil(data.total / ADMIN_PRODUCTS_PAGE_SIZE)) : 1

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['products', 'admin', shop?.id] })
    queryClient.invalidateQueries({ queryKey: ['products', 'active'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats', shop?.id] })
  }

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateProduct(id, { active }),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: deleteProductCompletely,
    onSuccess: () => {
      invalidate()
      setDeleteTarget(null)
    },
  })

  if (isLoading) return <Spinner />
  if (isError) return <ErrorMessage />

  return (
    <div>
      <PageHeader
        title="Produits"
        subtitle="Gérez vos produits, leur stock et leur visibilité."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Upload size={16} /> Importer (CSV)
            </button>
            <Link
              to="/admin/produits/nouveau"
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              <Plus size={16} /> Nouveau produit
            </Link>
          </div>
        }
      />

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value)
              setPage(1)
            }}
            placeholder="Rechercher un produit…"
            aria-label="Rechercher un produit"
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-gray-400 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          {STOCK_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => {
                setStockFilter(value)
                setPage(1)
                setSearchParams(value === 'all' ? {} : { stock: value }, { replace: true })
              }}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                stockFilter === value ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {products.length === 0 ? (
          <EmptyState icon={Package} title="Aucun produit" description="Ajoutez votre premier produit." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Produit</th>
                  <th className="px-4 py-3 font-medium">Prix</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Actif</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => (
                  <tr key={product.id} className="transition-colors hover:bg-gray-50">
                    <td className="flex items-center gap-3 px-4 py-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        {product.images[0] ? (
                          <img src={product.images[0].public_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-gray-300">
                            <ImageOff size={16} />
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-gray-900">{product.name}</span>
                      {product.category && (
                        <span className="hidden rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 sm:inline">
                          {product.category.name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{formatCurrency(product.price, currency)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          product.stock <= 0
                            ? 'bg-red-100 text-red-800'
                            : product.stock <= lowStockThreshold
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive.mutate({ id: product.id, active: !product.active })}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          product.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {product.active ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/admin/produits/${product.id}`}
                          aria-label={`Modifier ${product.name}`}
                          className="text-gray-400 hover:text-gray-700"
                        >
                          <Pencil size={16} />
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(product)}
                          aria-label={`Supprimer ${product.name}`}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
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

      <ConfirmDialog
        open={!!deleteTarget}
        title="Supprimer ce produit ?"
        description={
          deleteTarget
            ? `« ${deleteTarget.name} » et ses photos seront définitivement supprimés de votre boutique.`
            : undefined
        }
        confirmLabel="Supprimer"
        pendingLabel="Suppression…"
        pending={remove.isPending}
        onConfirm={() => {
          if (deleteTarget) remove.mutate(deleteTarget.id)
        }}
        onClose={() => setDeleteTarget(null)}
      />

      {shop && (
        <ProductImportDialog
          open={importOpen}
          onClose={() => setImportOpen(false)}
          shopId={shop.id}
          categories={categories}
          maxActiveProducts={PLANS[planKey].maxActiveProducts}
          onImported={invalidate}
        />
      )}
    </div>
  )
}