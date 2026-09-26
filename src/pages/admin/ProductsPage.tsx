import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { ImageOff, Package, Pencil, Plus, Search, Tags, Trash2, Upload, X } from 'lucide-react'
import { useShopRole } from '@/features/shop-settings/useShopRole'
import { canAccess } from '@/features/shop-settings/permissions'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { useCategories } from '@/features/categories/useCategories'
import { useShopPlan } from '@/features/billing/useShopPlan'
import { useShopProducts } from '@/features/products/useProducts'
import { countActiveProducts, deleteProductCompletely, updateProduct } from '@/services/product.service'
import { formatCurrency } from '@/utils/format'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { ADMIN_PRODUCTS_PAGE_SIZE } from '@/config/constants'
import { PLANS } from '@/config/plans'
import { PageLoader } from '@/components/ui/PageLoader'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { EmptyState } from '@/components/ui/EmptyState'
import { usePageSeo } from '@/hooks/usePageSeo'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { ProductImportDialog } from './ProductImportDialog'
import { CategoriesPage } from './CategoriesPage'
import { priceRange } from '@/utils/productPricing'
import type { ProductWithRelations } from '@/types'
import { buttonClass } from '@/components/ui/styles'

/** Advertised price: "À partir de X" when variants are priced differently. */
function priceLabel(product: ProductWithRelations, currency: string): string {
  const { min, hasRange } = priceRange(product)
  return `${hasRange ? 'À partir de ' : ''}${formatCurrency(min, currency)}`
}

const STOCK_FILTERS: { value: 'all' | 'low' | 'out'; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'low', label: 'Stock faible' },
  { value: 'out', label: 'Rupture' },
]

type CatalogTab = 'produits' | 'categories'

/** Catégories used to be its own top-level nav item/route; folding it in
 *  here as a tab keeps the sidebar shorter without losing anything — both
 *  still get their own URL (?tab=categories) so links/back-button work. */
function CatalogTabs({ tab, onChange }: { tab: CatalogTab; onChange: (tab: CatalogTab) => void }) {
  const tabs: { key: CatalogTab; label: string; icon: typeof Package }[] = [
    { key: 'produits', label: 'Produits', icon: Package },
    { key: 'categories', label: 'Catégories', icon: Tags },
  ]
  return (
    <div className="flex gap-1 border-b border-gray-200">
      {tabs.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
            tab === key
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Icon size={15} aria-hidden />
          {label}
        </button>
      ))}
    </div>
  )
}

function InlineField({
  value,
  display,
  label,
  min = 0,
  readOnly = false,
  onSave,
}: {
  value: number
  display: React.ReactNode
  label: string
  min?: number
  /** Rôle sans droit d'écriture sur le catalogue : la valeur s'affiche, sans édition. */
  readOnly?: boolean
  onSave: (next: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))

  const commit = () => {
    const next = Number(draft)
    setEditing(false)
    if (!Number.isNaN(next) && next >= min && next !== value) onSave(next)
  }

  if (readOnly) return <span>{display}</span>

  if (!editing) {
    return (
      <span
        role="button"
        tabIndex={0}
        aria-label={label}
        title={label}
        onClick={() => {
          setDraft(String(value))
          setEditing(true)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setDraft(String(value))
            setEditing(true)
          }
        }}
        className="cursor-text rounded-md transition-colors hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
      >
        {display}
      </span>
    )
  }

  return (
    <input
      autoFocus
      type="number"
      min={min}
      step="1"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') setEditing(false)
      }}
      className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-brand-400 focus:outline-none"
      aria-label={label}
    />
  )
}

function PlanGauge({ active, max, label }: { active: number; max: number; label: string }) {
  const pct = Math.min(100, Math.round((active / max) * 100))
  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-gray-500">{label} — produits actifs</span>
        <span className="font-medium text-gray-900">
          {active}/{max}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-brand-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {pct >= 80 && (
        <p className="mt-2 text-xs text-gray-500">
          {pct >= 100
            ? 'Limite atteinte : les nouveaux produits seront enregistrés inactifs. '
            : 'Vous approchez de la limite des produits actifs. '}
          <Link to="/admin/parametres/facturation" className="font-medium text-brand-700 underline underline-offset-2">
            Passer à Pro
          </Link>
        </p>
      )}
    </div>
  )
}

export function ProductsPage() {
  usePageSeo({ title: 'Produits — Bitiko', noindex: true })
  const { data: shop } = useMyShop()
  const { data: categories = [] } = useCategories(shop?.id)
  const { planKey } = useShopPlan(shop?.id)
  const queryClient = useQueryClient()
  const toast = useToast()
  const currency = shop?.currency ?? 'XOF'
  const lowStockThreshold = shop?.low_stock_threshold ?? 5
  const { role } = useShopRole()
  const readOnly = !canAccess(role, 'catalog_write')

  const [searchParams, setSearchParams] = useSearchParams()
  const tab: CatalogTab = searchParams.get('tab') === 'categories' ? 'categories' : 'produits'
  const switchTab = (next: CatalogTab) => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        if (next === 'categories') params.set('tab', 'categories')
        else params.delete('tab')
        return params
      },
      { replace: true },
    )
  }
  const stockParam = searchParams.get('stock')
  const categoryParam = searchParams.get('category')
  const categoryFilter = categoryParam ?? ''
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
      categoryId: categoryFilter || undefined,
      page,
    },
    lowStockThreshold,
  )

  const { data: activeProductCount } = useQuery({
    queryKey: ['active-product-count', shop?.id],
    queryFn: () => countActiveProducts(shop?.id as string),
    enabled: !!shop?.id,
  })

  const products = data?.products ?? []
  const totalPages = data ? Math.max(1, Math.ceil(data.total / ADMIN_PRODUCTS_PAGE_SIZE)) : 1

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['products', 'admin', shop?.id] })
    queryClient.invalidateQueries({ queryKey: ['products', 'active'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats', shop?.id] })
  }

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateProduct(id, { active }),
    onSuccess: (_data, variables) => {
      invalidate()
      toast.success(variables.active ? 'Produit activé.' : 'Produit désactivé.')
    },
    onError: () => toast.error('Impossible de modifier le produit.'),
  })

  const remove = useMutation({
    mutationFn: deleteProductCompletely,
    onSuccess: () => {
      invalidate()
      setDeleteTarget(null)
      toast.success('Produit supprimé.')
    },
    onError: () => toast.error('Impossible de supprimer le produit.'),
  })

  const quickUpdate = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { price?: number; stock?: number } }) =>
      updateProduct(id, updates),
    onSuccess: () => {
      invalidate()
      toast.success('Mise à jour enregistrée.')
    },
    onError: () => toast.error('Impossible de mettre à jour le produit.'),
  })

  if (isLoading && tab === 'produits') return <PageLoader />
  if (isError && tab === 'produits') return <ErrorMessage />

  return (
    <div>
      <CatalogTabs tab={tab} onChange={switchTab} />

      {tab === 'categories' ? (
        <CategoriesPage />
      ) : (
      <>
      <PageHeader
        title="Produits"
        subtitle="Gérez vos produits, leur stock et leur visibilité."
        actions={
          readOnly ? undefined : <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className={buttonClass({ variant: 'secondary' })}
            >
              <Upload size={16} /> Importer (CSV)
            </button>
            <Link
              to="/admin/produits/nouveau"
              data-guide="guide-nouveau-produit"
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
            data-guide="guide-recherche-produit"
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-gray-400 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => {
              const next = e.target.value
              setPage(1)
              setSearchParams(
                { ...(stockFilter === 'all' ? {} : { stock: stockFilter }), ...(next ? { category: next } : {}) },
                { replace: true },
              )
            }}
            aria-label="Filtrer par catégorie"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
          >
            <option value="">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji ? `${c.emoji}  ` : ''}
                {c.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            {STOCK_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => {
                  setStockFilter(value)
                  setPage(1)
                  setSearchParams(
                    {
                      ...(value === 'all' ? {} : { stock: value }),
                      ...(categoryFilter ? { category: categoryFilter } : {}),
                    },
                    { replace: true },
                  )
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
      </div>

      {categoryFilter && (
        <div className="mt-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
            {categories.find((c) => c.id === categoryFilter)?.emoji && <span>{categories.find((c) => c.id === categoryFilter)?.emoji}</span>}
            {categories.find((c) => c.id === categoryFilter)?.name ?? 'Catégorie'}
            <button
              type="button"
              onClick={() => {
                setPage(1)
                setSearchParams(
                  { ...(stockFilter === 'all' ? {} : { stock: stockFilter }) },
                  { replace: true },
                )
              }}
              aria-label="Retirer le filtre de catégorie"
              className="text-brand-500 hover:text-brand-700"
            >
              <X size={14} />
            </button>
          </span>
        </div>
      )}

      {activeProductCount != null && PLANS[planKey].maxActiveProducts !== null && (
        <div data-guide="guide-plan-produits">
          <PlanGauge active={activeProductCount} max={PLANS[planKey].maxActiveProducts} label={PLANS[planKey].label} />
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {products.length === 0 ? (
          <EmptyState icon={Package} title="Aucun produit" description="Ajoutez votre premier produit." />
        ) : (
          <>
            {/* Cards below md — a horizontally-scrolled table hides the price/stock
                columns off-screen on a phone; a stacked card shows everything at once. */}
            <ul className="divide-y divide-gray-100 md:hidden">
              {products.map((product) => (
                <li key={product.id} className="flex flex-col gap-3 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {product.images[0] ? (
                        <img src={product.images[0].public_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-300">
                          <ImageOff size={16} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-900">{product.name}</p>
                      {product.category && <p className="truncate text-xs text-gray-500">{product.category.name}</p>}
                    </div>
                    {!readOnly && (

                    <div className="flex shrink-0 items-center gap-3">
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
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-4 text-sm">
                      <InlineField
                        readOnly={readOnly}
                        value={product.price}
                        label={`Modifier le prix de ${product.name}`}
                        display={<span className="font-medium text-gray-900">{priceLabel(product, currency)}</span>}
                        onSave={(price) => quickUpdate.mutate({ id: product.id, updates: { price } })}
                      />
                      <InlineField
                        readOnly={readOnly}
                        value={product.stock}
                        label={`Modifier le stock de ${product.name}`}
                        min={0}
                        display={
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
                        }
                        onSave={(stock) => quickUpdate.mutate({ id: product.id, updates: { stock } })}
                      />
                    </div>
                    <button
                      disabled={readOnly}
                      onClick={() => toggleActive.mutate({ id: product.id, active: !product.active })}
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        product.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {product.active ? 'Actif' : 'Inactif'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Table from md up. */}
            <div className="hidden overflow-x-auto md:block">
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
                        <span className="inline rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                          {product.category.name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <InlineField
                        readOnly={readOnly}
                        value={product.price}
                        label={`Modifier le prix de ${product.name}`}
                        display={priceLabel(product, currency)}
                        onSave={(price) => quickUpdate.mutate({ id: product.id, updates: { price } })}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <InlineField
                        readOnly={readOnly}
                        value={product.stock}
                        label={`Modifier le stock de ${product.name}`}
                        min={0}
                        display={
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
                        }
                        onSave={(stock) => quickUpdate.mutate({ id: product.id, updates: { stock } })}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        disabled={readOnly}
                      onClick={() => toggleActive.mutate({ id: product.id, active: !product.active })}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          product.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {product.active ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {!readOnly && (

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
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}

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
      </>
      )}
    </div>
  )
}