import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useShop } from '@/features/shop-settings/useShop'
import { getDashboardStats } from '@/services/dashboard.service'
import { formatCurrency } from '@/utils/format'
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/config/constants'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  )
}

export function DashboardPage() {
  const { data: shop } = useShop()
  const {
    data: stats,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['dashboard-stats', shop?.id],
    queryFn: () => getDashboardStats(shop!.id),
    enabled: !!shop?.id,
  })

  if (isLoading) return <Spinner />
  if (isError) return <ErrorMessage />
  if (!stats) return null

  const currency = shop?.currency ?? 'XOF'

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Tableau de bord</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Produits" value={String(stats.totalProducts)} />
        <StatCard label="Produits actifs" value={String(stats.activeProducts)} />
        <StatCard label="Ruptures de stock" value={String(stats.outOfStockProducts)} />
        <StatCard label="Commandes" value={String(stats.totalOrders)} />
        <StatCard label="Commandes en attente" value={String(stats.pendingOrders)} />
        <StatCard label="Chiffre d'affaires" value={formatCurrency(stats.paidOrdersRevenue, currency)} />
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Dernières commandes</h2>
          <Link to="/admin/commandes" className="text-sm font-medium text-brand-700">
            Voir tout
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Commande</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats.recentOrders.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                    Aucune commande pour le moment.
                  </td>
                </tr>
              )}
              {stats.recentOrders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3">
                    <Link to={`/admin/commandes/${order.id}`} className="font-medium text-brand-700">
                      {order.order_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{order.customer_name}</td>
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
      </div>
    </div>
  )
}
