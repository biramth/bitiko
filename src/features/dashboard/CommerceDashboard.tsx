import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ChevronRight, Eye, PackageX, ShoppingBag, Wallet, AlertTriangle, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { ORDER_STATUS_ACTION_LABELS, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, getLinearNext } from '@/config/constants'
import { updateOrderStatus } from '@/services/order.service'
import type { DashboardStats } from '@/services/dashboard.service'
import { formatCurrency, timeAgo } from '@/utils/format'
import type { Order, OrderStatus } from '@/types'

function Kpi({ icon: Icon, label, value, hint, to }: { icon: LucideIcon; label: string; value: string; hint?: string; to?: string }) {
  const body = (
    <div className="h-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Icon size={15} aria-hidden /> {label}
      </div>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
      <p className="mt-0.5 min-h-4 text-xs text-gray-400">{hint}</p>
    </div>
  )
  return to ? <Link to={to} className="block min-w-0">{body}</Link> : <div className="min-w-0">{body}</div>
}

function OrderRow({ order, currency, onAdvance, busy }: { order: Order; currency: string; onAdvance: (status: OrderStatus) => void; busy: boolean }) {
  const next = getLinearNext(order.status)
  return (
    <li className="flex items-center gap-3 py-3">
      <Link to={`/admin/commandes/${order.id}`} className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium text-brand-700">{order.order_number}</span>
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ORDER_STATUS_COLORS[order.status]}`}>{ORDER_STATUS_LABELS[order.status]}</span>
        </p>
        <p className="mt-0.5 truncate text-sm text-gray-700">
          {order.customer_name} · <span className="font-medium text-gray-900">{formatCurrency(Number(order.total), currency)}</span>
        </p>
        <p className="text-xs text-gray-400">{timeAgo(order.created_at)}</p>
      </Link>
      {next && (
        <Button size="sm" variant={order.status === 'pending' ? 'primary' : 'secondary'} disabled={busy} onClick={() => onAdvance(next)} className="shrink-0">
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
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <ShoppingBag size={17} className="text-gray-400" aria-hidden /> Commandes à traiter
              {stats.ordersToProcess.length > 0 && <Badge tone="warning">{stats.ordersToProcessCount}</Badge>}
            </h3>
            <Link to="/admin/commandes" className="inline-flex items-center gap-0.5 text-sm font-medium text-brand-700 hover:text-brand-800">
              Toutes <ChevronRight size={14} aria-hidden />
            </Link>
          </div>
          {stats.ordersToProcess.length === 0 ? (
            <div className="mt-4 flex items-center gap-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 size={18} className="shrink-0" aria-hidden />
              <span>{stats.totalOrders === 0 ? 'Aucune commande pour le moment. Partagez le lien de votre site pour recevoir la première.' : 'Tout est à jour : aucune commande n’attend votre action.'}</span>
            </div>
          ) : (
            <ul className="mt-2 divide-y divide-gray-100">
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
          )}
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <AlertTriangle size={17} className="text-gray-400" aria-hidden /> Stock à surveiller
            </h3>
            <Link to="/admin/produits?stock=low" className="inline-flex items-center gap-0.5 text-sm font-medium text-brand-700 hover:text-brand-800">
              Voir <ChevronRight size={14} aria-hidden />
            </Link>
          </div>
          {stats.stockAlerts.length === 0 ? (
            <div className="mt-4 flex items-center gap-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 size={18} className="shrink-0" aria-hidden />
              <span>Aucun produit sous le seuil d’alerte ({lowStockThreshold}).</span>
            </div>
          ) : (
            <ul className="mt-2 divide-y divide-gray-100">
              {stats.stockAlerts.map((product) => (
                <li key={product.id}>
                  <Link to={`/admin/produits/${product.id}`} className="flex items-center justify-between gap-3 py-3 text-sm hover:text-brand-700">
                    <span className="min-w-0 truncate text-gray-800">{product.name}</span>
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

      <div className={`grid grid-cols-2 gap-4 ${advancedAnalytics ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
        <Kpi icon={Wallet} label="CA aujourd’hui" value={formatCurrency(stats.revenueToday, currency)} hint={`${stats.ordersToday} commande${stats.ordersToday > 1 ? 's' : ''}`} to="/admin/commandes" />
        <Kpi icon={Eye} label="Visites aujourd’hui" value={String(stats.visitsToday)} hint={`${stats.visitors30d} visiteurs sur 30 jours`} />
        <Kpi icon={ShoppingBag} label="Commandes" value={String(stats.totalOrders)} hint={`${stats.activeProducts} produit${stats.activeProducts > 1 ? 's' : ''} actif${stats.activeProducts > 1 ? 's' : ''}`} to="/admin/commandes" />
        <Kpi icon={Wallet} label="CA total" value={formatCurrency(stats.salesTotal, currency)} hint="hors commandes annulées" />
        {advancedAnalytics && <Kpi icon={ShoppingBag} label="Panier moyen" value={formatCurrency(stats.averageOrderValue, currency)} />}
      </div>

      {advancedAnalytics ? (
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Produits les plus vendus</h3>
            <Link to="/admin/produits" className="text-sm font-medium text-brand-700">Gérer les produits</Link>
          </div>
          {stats.topProducts.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">Les meilleures ventes apparaîtront après votre première commande.</p>
          ) : (
            <ol className="mt-3 divide-y divide-gray-100">
              {stats.topProducts.map((product, index) => {
                const barWidth = Math.max(6, Math.round((product.revenue / (stats.topProducts[0].revenue || 1)) * 100))
                return (
                  <li key={product.name} className="py-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">{index + 1}</span>
                        <span className="truncate text-gray-800">{product.name}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <strong className="block text-gray-900">{product.quantity} vendu{product.quantity > 1 ? 's' : ''}</strong>
                        <span className="text-xs text-gray-500">{formatCurrency(product.revenue, currency)}</span>
                      </span>
                    </div>
                    <div className="ml-10 mt-2 h-1.5 rounded-full bg-gray-100">
                      <div className="h-1.5 rounded-full bg-brand-400" style={{ width: `${barWidth}%` }} />
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </Card>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Analytics commerçantes</p>
            <h3 className="mt-1 text-lg font-semibold text-gray-900">Comprenez ce qui se vend vraiment</h3>
            <p className="mt-1 max-w-xl text-sm text-gray-600">Panier moyen, produits les plus vendus et tendances détaillées sont disponibles à partir de l’offre Essentiel.</p>
          </div>
          <Link to="/admin/parametres/facturation" className="mt-4 inline-flex shrink-0 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 sm:mt-0">
            Voir les offres
          </Link>
        </div>
      )}
    </div>
  )
}
