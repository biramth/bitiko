import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, ShoppingBag } from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { getOrderStatusCounts, listOrders, updateOrderStatus } from '@/services/order.service'
import { formatCurrency } from '@/utils/format'
import {
  ORDER_STATUS_ACTION_LABELS,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  ORDERS_PAGE_SIZE,
  getLinearNext,
} from '@/config/constants'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { EmptyState } from '@/components/ui/EmptyState'
import type { OrderStatus } from '@/types'
import { usePageSeo } from '@/hooks/usePageSeo'
import { PageHeader } from '@/components/ui/PageHeader'

const STATUS_FILTERS: (OrderStatus | 'all')[] = ['all', 'pending', 'confirmed', 'paid', 'delivered', 'cancelled']

const PAYMENT_LABELS: Record<string, string> = {
  cod: 'Espèces',
  mobile_money: 'Mobile money',
}

function OrderActionButton({
  status,
  onAdvance,
  pending,
}: {
  status: OrderStatus
  onAdvance: (next: OrderStatus) => void
  pending: boolean
}) {
  const next = getLinearNext(status)
  if (!next) {
    return <span className="text-xs text-gray-400">{status === 'cancelled' ? 'Annulée' : 'Terminée'}</span>
  }
  return (
    <button
      type="button"
      onClick={() => onAdvance(next)}
      disabled={pending}
      className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60"
    >
      {ORDER_STATUS_ACTION_LABELS[next]}
    </button>
  )
}

export function OrdersPage() {
  usePageSeo({ title: 'Commandes — Bitiko', noindex: true })
  const { data: shop } = useMyShop()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const statusParam = searchParams.get('status')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>(
    statusParam === 'pending' || statusParam === 'confirmed' || statusParam === 'paid' ||
    statusParam === 'delivered' || statusParam === 'cancelled'
      ? statusParam
      : 'all',
  )
  const currency = shop?.currency ?? 'XOF'
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 300)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['orders', shop?.id, statusFilter, page, search],
    queryFn: () =>
      listOrders(shop!.id, page, statusFilter === 'all' ? undefined : statusFilter, search),
    enabled: !!shop?.id,
  })

  const { data: counts } = useQuery({
    queryKey: ['orders-counts', shop?.id],
    queryFn: () => getOrderStatusCounts(shop!.id),
    enabled: !!shop?.id,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', shop?.id] })
      queryClient.invalidateQueries({ queryKey: ['orders-counts', shop?.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats', shop?.id] })
    },
  })

  const orders = data?.orders ?? []
  const totalPages = data ? Math.max(1, Math.ceil(data.total / ORDERS_PAGE_SIZE)) : 1

  return (
    <div>
      <PageHeader
        title="Commandes"
        subtitle="Suivez et traitez les commandes reçues via WhatsApp et la boutique."
      />

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((status) => {
          const count =
            status === 'all' ? (counts?.total ?? 0) : (counts?.counts[status as OrderStatus] ?? 0)
          const active = statusFilter === status
          return (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status)
                setPage(1)
                setSearchParams(status === 'all' ? {} : { status }, { replace: true })
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${
                active ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'Toutes' : ORDER_STATUS_LABELS[status]}
              {count > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    active ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
          })}
        </div>

        <div className="relative sm:w-64">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value)
              setPage(1)
            }}
            placeholder="Client, téléphone, n° commande…"
            aria-label="Rechercher une commande"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {isLoading && <Spinner />}
        {isError && <ErrorMessage />}
        {!isLoading && !isError && orders.length === 0 && (
          <EmptyState icon={ShoppingBag} title="Aucune commande" />
        )}
        {!isLoading && orders.length > 0 && (
          <>
            {/* Cards below sm — a horizontally-scrolled table is easy to miss
                columns on on a phone; a stacked card shows everything at once. */}
            <ul className="divide-y divide-gray-100 sm:hidden">
              {orders.map((order) => (
                <li key={order.id} className="flex flex-col gap-2 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={`/admin/commandes/${order.id}`} className="font-medium text-brand-700">
                        {order.order_number}
                      </Link>
                      <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <p className="shrink-0 font-medium text-gray-900">{formatCurrency(Number(order.total), currency)}</p>
                  </div>
                  <p className="text-sm text-gray-700">
                    {order.customer_name} <span className="text-gray-400">· {order.customer_phone}</span>
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ORDER_STATUS_COLORS[order.status]}`}
                      >
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          order.payment_method === 'mobile_money'
                            ? 'bg-violet-50 text-violet-700'
                            : 'bg-sky-50 text-sky-700'
                        }`}
                      >
                        {PAYMENT_LABELS[order.payment_method] ?? order.payment_method}
                      </span>
                    </div>
                    <OrderActionButton
                      status={order.status}
                      pending={statusMutation.isPending}
                      onAdvance={(next) => statusMutation.mutate({ id: order.id, status: next })}
                    />
                  </div>
                </li>
              ))}
            </ul>

            {/* Table from sm up. */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-100 text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Commande</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 text-right font-medium">Action</th>
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
                        <span
                          className={`mt-1 block w-fit rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            order.payment_method === 'mobile_money'
                              ? 'bg-violet-50 text-violet-700'
                              : 'bg-sky-50 text-sky-700'
                          }`}
                        >
                          {PAYMENT_LABELS[order.payment_method] ?? order.payment_method}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <OrderActionButton
                          status={order.status}
                          pending={statusMutation.isPending}
                          onAdvance={(next) => statusMutation.mutate({ id: order.id, status: next })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
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
