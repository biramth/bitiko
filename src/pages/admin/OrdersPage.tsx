import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { listOrders } from '@/services/order.service'
import { formatCurrency } from '@/utils/format'
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, ORDERS_PAGE_SIZE } from '@/config/constants'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { EmptyState } from '@/components/ui/EmptyState'
import type { OrderStatus } from '@/types'
import { usePageSeo } from '@/hooks/usePageSeo'

const STATUS_FILTERS: (OrderStatus | 'all')[] = ['all', 'pending', 'confirmed', 'paid', 'delivered', 'cancelled']

export function OrdersPage() {
  usePageSeo({ title: 'Commandes — Bitiko', noindex: true })
  const { data: shop } = useMyShop()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const currency = shop?.currency ?? 'XOF'

  const { data, isLoading, isError } = useQuery({
    queryKey: ['orders', shop?.id, statusFilter, page],
    queryFn: () =>
      listOrders(shop!.id, page, statusFilter === 'all' ? undefined : statusFilter),
    enabled: !!shop?.id,
  })

  const orders = data?.orders ?? []
  const totalPages = data ? Math.max(1, Math.ceil(data.total / ORDERS_PAGE_SIZE)) : 1

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Commandes</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            onClick={() => {
              setStatusFilter(status)
              setPage(1)
            }}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              statusFilter === status ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {status === 'all' ? 'Toutes' : ORDER_STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {isLoading && <Spinner />}
        {isError && <ErrorMessage />}
        {!isLoading && !isError && orders.length === 0 && (
          <EmptyState icon={ShoppingBag} title="Aucune commande" />
        )}
        {!isLoading && orders.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Commande</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3">
                      <Link to={`/admin/commandes/${order.id}`} className="font-medium text-brand-700">
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      {order.customer_name}
                      <div className="text-xs text-gray-400">{order.customer_phone}</div>
                    </td>
                    <td className="px-4 py-3">{formatCurrency(Number(order.total), currency)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ORDER_STATUS_COLORS[order.status]}`}
                      >
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
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
    </div>
  )
}
