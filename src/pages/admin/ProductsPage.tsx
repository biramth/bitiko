import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ImageOff, Package, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { useShopProducts } from '@/features/products/useProducts'
import { deleteProduct, updateProduct } from '@/services/product.service'
import { formatCurrency } from '@/utils/format'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { EmptyState } from '@/components/ui/EmptyState'

export function ProductsPage() {
  const { data: shop } = useMyShop()
  const { data: products, isLoading, isError } = useShopProducts(shop?.id)
  const queryClient = useQueryClient()
  const currency = shop?.currency ?? 'XOF'

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['products', 'admin', shop?.id] })

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateProduct(id, { active }),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: deleteProduct,
    onSuccess: invalidate,
  })

  if (isLoading) return <Spinner />
  if (isError) return <ErrorMessage />

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Produits</h1>
        <Link
          to="/admin/produits/nouveau"
          className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          <Plus size={16} /> Nouveau produit
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {(products?.length ?? 0) === 0 ? (
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
                {products!.map((product) => (
                  <tr key={product.id}>
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
                    </td>
                    <td className="px-4 py-3">{formatCurrency(product.price, currency)}</td>
                    <td className="px-4 py-3">{product.stock}</td>
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
                          onClick={() => {
                            if (confirm(`Supprimer "${product.name}" ?`)) remove.mutate(product.id)
                          }}
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
    </div>
  )
}
