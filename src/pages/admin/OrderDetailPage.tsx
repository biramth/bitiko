import { useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { getOrderById, updateOrderStatus } from '@/services/order.service'
import { formatCurrency } from '@/utils/format'
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/config/constants'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import type { OrderStatus } from '@/types'

import { usePageSeo } from '@/hooks/usePageSeo'

const STATUSES: OrderStatus[] = ['pending', 'confirmed', 'paid', 'delivered', 'cancelled']

export function OrderDetailPage() {
  usePageSeo({ title: 'Commande — Bitiko', noindex: true })
  const { id } = useParams<{ id: string }>()
  const { data: shop } = useMyShop()
  const queryClient = useQueryClient()
  const currency = shop?.currency ?? 'XOF'

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn: () => getOrderById(id as string),
    enabled: !!id,
  })

  const statusMutation = useMutation({
    mutationFn: (status: OrderStatus) => updateOrderStatus(id as string, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      queryClient.invalidateQueries({ queryKey: ['orders', shop?.id] })
    },
  })

  if (isLoading) return <Spinner />
  if (isError || !order) return <ErrorMessage message="Commande introuvable." />

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/admin/commandes" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} /> Retour aux commandes
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Commande {order.order_number}</h1>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        {new Date(order.created_at).toLocaleString('fr-FR')}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-medium text-gray-500">Client</h2>
          <p className="mt-1 font-medium text-gray-900">{order.customer_name}</p>
          <p className="text-sm text-gray-600">{order.customer_phone}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-medium text-gray-500">Changer le statut</h2>
          <select
            value={order.status}
            onChange={(e) => statusMutation.mutate(e.target.value as OrderStatus)}
            disabled={statusMutation.isPending}
            className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Produit</th>
              <th className="px-4 py-3 font-medium">Prix unitaire</th>
              <th className="px-4 py-3 font-medium">Quantité</th>
              <th className="px-4 py-3 font-medium">Sous-total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">{item.product_name}</td>
                <td className="px-4 py-3">{formatCurrency(Number(item.unit_price), currency)}</td>
                <td className="px-4 py-3">{item.quantity}</td>
                <td className="px-4 py-3">{formatCurrency(Number(item.subtotal), currency)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-100 font-semibold text-gray-900">
              <td className="px-4 py-3" colSpan={3}>
                Total
              </td>
              <td className="px-4 py-3">{formatCurrency(Number(order.total), currency)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
