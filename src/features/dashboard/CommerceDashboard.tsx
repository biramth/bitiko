import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChartColumn, Eye, PackageX, ShoppingBag, TrendingUp, Wallet, TriangleAlert, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { ORDER_STATUS_ACTION_LABELS, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, getLinearNext } from '@/config/constants'
import { updateOrderStatus } from '@/services/order.service'
import { useUpgrade } from '@/features/billing/upgradeContext'
import type { DashboardStats } from '@/services/dashboard.service'
import { formatCurrency, timeAgo } from '@/utils/format'
import type { Order, OrderStatus } from '@/types'
import { DashboardIdleNotice, DashboardKpi, DashboardOkNotice, DashboardSectionHeader } from './dashboardUi'

function OrderRow({ order, currency, onAdvance, busy }: { order: Order; currency: string; onAdvance: (status: OrderStatus) => void; busy: boolean }) {
  const next = getLinearNext(order.status)
  const isUrgent = order.status === 'pending'
  return (
    <li className={`flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-gray-50 ${isUrgent ? 'bg-amber-50/40 hover:bg-amber-50/70' : ''}`}>
      <Link to={`/admin/commandes/${order.id}`} className="min-w-0 flex-1 rounded-lg focus-visible:outline-none">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-brand-700">{order.order_number}</span>
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ORDER_STATUS_COLORS[order.status]}`}>{ORDER_STATUS_LABELS[order.status]}</span>
        </p>
        <p className="mt-1 truncate text-sm text-gray-700">
          {order.customer_name} · <span className="font-semibold text-gray-900">{formatCurrency(Number(order.total), currency)}</span>
        </p>
        <p className="mt-0.5 text-xs tabular-nums text-gray-400">{timeAgo(order.created_at)}</p>
      </Link>
      {next && (
        <Button
          size="sm"
          variant={isUrgent ? 'primary' : 'secondary'}
          disabled={busy}
          onClick={() => onAdvance(next)}
          className="min-h-9 shrink-0"
          aria-label={`${ORDER_STATUS_ACTION_LABELS[next]} — ${order.order_number}`}
        >
          {ORDER_STATUS_ACTION_LABELS[next]}
        </Button>
      )}
    </li>
  )
}

/** Tableau de bord d'un commerce : ce qui demande une action d'abord, les chiffres ensuite. */
export function CommerceDashboard({
  shopId,
  stats,
  currency,
  advancedAnalytics,
  lowStockThreshold,
}: {
  shopId: string
  stats: DashboardStats
  currency: string
  advancedAnalytics: boolean
  lowStockThreshold: number
}) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { openUpgrade } = useUpgrade()

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => updateOrderStatus(id, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats', shopId] })
      queryClient.invalidateQueries({ queryKey: ['orders', shopId] })
      queryClient.invalidateQueries({ queryKey: ['order'] })
      toast.success(`Commande ${ORDER_STATUS_LABELS[variables.status].toLowerCase()}.`)
    },
    onError: () => toast.error('Impossible de mettre à jour la commande.'),
  })

  return (
    <div className="mt-5 space-y-4 sm:space-y-5">
      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="rounded-2xl xl:col-span-3">
          <DashboardSectionHeader
            icon={ShoppingBag}
            title="Commandes à traiter"
            count={stats.ordersToProcessCount}
            countTone="warning"
            actionTo="/admin/commandes"
            actionLabel="Toutes"
            accent="brand"
          />
          {stats.ordersToProcess.length === 0 ? (
            <DashboardOkNotice>
              {stats.totalOrders === 0 ? 'Aucune commande pour le moment. Partagez le lien de votre site pour recevoir la première.' : 'Tout est à jour : aucune commande n’attend votre action.'}
            </DashboardOkNotice>
          ) : (
            <>
              <p className="mt-2 text-xs text-gray-400">Les plus anciennes d’abord — un client attend votre réponse.</p>
              <ul className="mt-1 divide-y divide-gray-100">
                {stats.ordersToProcess.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    currency={currency}
                    busy={statusMutation.isPending}
                    onAdvance={(status) => statusMutation.mutate({ id: order.id, status })}
                  />
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card className="rounded-2xl xl:col-span-2">
          <DashboardSectionHeader
            icon={TriangleAlert}
            title="Stock à surveiller"
            count={stats.stockAlerts.length}
            countTone={stats.stockAlerts.some((p) => p.stock === 0) ? 'danger' : 'warning'}
            actionTo="/admin/produits?stock=low"
            actionLabel="Voir"
            accent="amber"
          />
          {stats.stockAlerts.length === 0 ? (
            <DashboardOkNotice>Aucun produit sous le seuil d’alerte ({lowStockThreshold}).</DashboardOkNotice>
          ) : (
            <ul className="mt-2 divide-y divide-gray-100">
              {stats.stockAlerts.map((product) => (
                <li key={product.id}>
                  <Link
                    to={`/admin/produits/${product.id}`}
                    className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-gray-50"
                  >
                    <span className="min-w-0 truncate font-medium text-gray-800">{product.name}</span>
                    {product.stock === 0 ? (
                      <Badge tone="danger" className="shrink-0"><PackageX size={12} aria-hidden /> Rupture</Badge>
                    ) : (
                      <Badge tone="warning" className="shrink-0">{product.stock} en stock</Badge>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className={`grid grid-cols-2 gap-3 sm:gap-4 ${advancedAnalytics ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
        <DashboardKpi icon={Wallet} accent="emerald" label="CA aujourd’hui" value={formatCurrency(stats.revenueToday, currency)} hint={`${stats.ordersToday} commande${stats.ordersToday > 1 ? 's' : ''}`} to="/admin/commandes" />
        <DashboardKpi icon={Eye} accent="sky" label="Visites aujourd’hui" value={String(stats.visitsToday)} hint={`${stats.visitors30d} visiteurs · 30 j`} />
        <DashboardKpi icon={ShoppingBag} accent="brand" label="Commandes" value={String(stats.totalOrders)} hint={`${stats.activeProducts} produit${stats.activeProducts > 1 ? 's' : ''} actif${stats.activeProducts > 1 ? 's' : ''}`} to="/admin/commandes" />
        <DashboardKpi icon={TrendingUp} accent="ink" label="CA total" value={formatCurrency(stats.salesTotal, currency)} hint="hors commandes annulées" />
        {advancedAnalytics && <div className="col-span-2 sm:col-span-1"><DashboardKpi icon={ChartColumn} accent="violet" label="Panier moyen" value={formatCurrency(stats.averageOrderValue, currency)} /></div>}
      </div>

      {advancedAnalytics ? (
        <Card className="rounded-2xl">
          <DashboardSectionHeader
            icon={ChartColumn as LucideIcon}
            title="Produits les plus vendus"
            actionTo="/admin/produits"
            actionLabel="Gérer les produits"
            accent="violet"
          />
          {stats.topProducts.length === 0 ? (
            <DashboardIdleNotice message="Les meilleures ventes apparaîtront après votre première commande." />
          ) : (
            <ol className="mt-3 divide-y divide-gray-100">
              {stats.topProducts.map((product, index) => {
                const barWidth = Math.max(6, Math.round((product.revenue / (stats.topProducts[0].revenue || 1)) * 100))
                return (
                  <li key={product.name} className="py-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex min-w-0 items-center gap-3">
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-700'}`}>{index + 1}</span>
                        <span className="truncate font-medium text-gray-800">{product.name}</span>
                      </span>
                      <span className="shrink-0 text-right tabular-nums">
                        <strong className="block text-gray-900">{product.quantity} vendu{product.quantity > 1 ? 's' : ''}</strong>
                        <span className="text-xs text-gray-500">{formatCurrency(product.revenue, currency)}</span>
                      </span>
                    </div>
                    <div className="ml-10 mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all" style={{ width: `${barWidth}%` }} />
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </Card>
      ) : (
        <Card className="rounded-2xl border-brand-100 bg-gradient-to-br from-brand-50/70 to-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                <ChartColumn size={18} aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold text-gray-900">Produits les plus vendus</h3>
                <p className="mt-1 text-sm text-gray-500">Découvrez ce qui se vend le mieux dans votre boutique.</p>
              </div>
            </div>
            <Button variant="secondary" onClick={() => openUpgrade('analytics')} className="min-h-10">
              Voir le détail
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
