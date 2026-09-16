import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Copy, ExternalLink, PackagePlus, Tags, Circle, CheckCircle2 } from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { getDashboardStats } from '@/services/dashboard.service'
import { updateOrderStatus } from '@/services/order.service'
import { formatCurrency } from '@/utils/format'
import { shopUrl } from '@/lib/tenant'
import { ORDER_STATUS_ACTION_LABELS, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, getLinearNext } from '@/config/constants'
import { PageLoader } from '@/components/ui/PageLoader'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { usePageSeo } from '@/hooks/usePageSeo'
import { PageHeader } from '@/components/ui/PageHeader'
import { useToast } from '@/components/ui/Toast'
import type { OrderStatus } from '@/types'

function StatCard({ label, value, to }: { label: string; value: string; to?: string }) {
  const inner = (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  )
  return to ? (
    <Link to={to} className="block transition-shadow hover:shadow-md">
      {inner}
    </Link>
  ) : (
    inner
  )
}

function SetupChecklist({
  items,
}: {
  items: { done: boolean; label: ReactNode; hint?: string; to?: string }[]
}) {
  const remaining = items.filter((i) => !i.done).length
  if (remaining === 0) return null

  return (
    <div className="mt-6 rounded-xl border border-brand-100 bg-brand-50 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Finalisez votre boutique</h2>
        <span className="text-xs font-medium text-brand-700">
          {items.length - remaining}/{items.length} terminé
        </span>
      </div>
      <ul className="mt-3 space-y-2 text-sm">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            {item.done ? (
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" aria-hidden />
            ) : (
              <Circle size={16} className="mt-0.5 shrink-0 text-gray-300" aria-hidden />
            )}
            <span className={item.done ? 'text-gray-400 line-through' : 'text-gray-700'}>
              {item.to && !item.done ? (
                <Link to={item.to} className="font-medium text-brand-700 hover:text-brand-800">
                  {item.label}
                </Link>
              ) : (
                item.label
              )}
              {!item.done && item.hint ? <span className="text-gray-500"> — {item.hint}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function DashboardPage() {
  usePageSeo({ title: 'Tableau de bord — Bitiko', noindex: true })
  const { data: shop } = useMyShop()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [copied, setCopied] = useState(false)

  const {
    data: stats,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['dashboard-stats', shop?.id],
    queryFn: () => getDashboardStats(shop!.id, shop?.low_stock_threshold),
    enabled: !!shop?.id,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => updateOrderStatus(id, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats', shop?.id] })
      queryClient.invalidateQueries({ queryKey: ['orders', shop?.id] })
      queryClient.invalidateQueries({ queryKey: ['order'] })
      toast.success(`Commande ${ORDER_STATUS_LABELS[variables.status]}.`)
    },
    onError: () => toast.error('Impossible de mettre à jour la commande.'),
  })

  const copyShopLink = async () => {
    if (!shop) return
    try {
      await navigator.clipboard.writeText(shopUrl(shop.slug))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Lien de la boutique copié.')
    } catch {
      window.location.href = shopUrl(shop.slug)
    }
  }

  if (isLoading) return <PageLoader />
  if (isError) return <ErrorMessage />
  if (!stats) return null

  const currency = shop?.currency ?? 'XOF'

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        subtitle="Vue d'ensemble de votre boutique : ventes, commandes et stock."
        actions={
          <>
            <Link
              to="/admin/produits/nouveau"
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              <PackagePlus size={16} /> Nouveau produit
            </Link>
            <Link
              to="/admin/categories"
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Tags size={16} /> Catégories
            </Link>
            {shop && (
              <>
                <button
                  onClick={copyShopLink}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Copy size={16} /> {copied ? 'Lien copié' : 'Copier le lien'}
                </button>
                <Link
                  to={shopUrl(shop.slug)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <ExternalLink size={16} /> Voir la boutique
                </Link>
              </>
            )}
          </>
        }
      />

      {shop && (
        <SetupChecklist
          items={[
            { done: stats.totalProducts > 0, label: 'Ajoutez vos premiers produits', to: '/admin/produits/nouveau' },
            { done: !!shop.whatsapp_number, label: 'Vérifiez votre numéro WhatsApp', to: '/admin/parametres' },
            { done: Number(shop.delivery_fee) > 0, label: 'Définissez vos frais de livraison', to: '/admin/parametres' },
            { done: stats.totalOrders > 0, label: 'Recevez votre première commande', hint: 'Partagez le lien de votre boutique' },
          ]}
        />
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Produits" value={String(stats.totalProducts)} to="/admin/produits" />
        <StatCard label="Commandes" value={String(stats.totalOrders)} to="/admin/commandes" />
        <StatCard label="En attente" value={String(stats.pendingOrders)} to="/admin/commandes?status=pending" />
        <StatCard label="Chiffre d'affaires" value={formatCurrency(stats.salesTotal, currency)} to="/admin/commandes" />
        <StatCard label="Ventes aujourd'hui" value={String(stats.ordersToday)} to="/admin/commandes" />
        <StatCard label="CA aujourd'hui" value={formatCurrency(stats.revenueToday, currency)} />
        <StatCard label="Panier moyen" value={formatCurrency(stats.averageOrderValue, currency)} to="/admin/commandes" />
        <StatCard label="Ruptures de stock" value={String(stats.outOfStockProducts)} to="/admin/produits?stock=out" />
        <StatCard label="Stock faible" value={String(stats.lowStockProducts)} to="/admin/produits?stock=low" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Produits les plus vendus</h2>
            <Link to="/admin/produits" className="text-sm font-medium text-brand-700">Gérer les produits</Link>
          </div>
          {stats.topProducts.length === 0 ? (
            <p className="mt-5 text-sm text-gray-500">Les meilleures ventes apparaîtront après votre première commande.</p>
          ) : (
            <ol className="mt-4 divide-y divide-gray-100">
              {stats.topProducts.map((product, index) => (
                <li key={product.name} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <span className="flex min-w-0 items-center gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">{index + 1}</span><span className="truncate text-gray-800">{product.name}</span></span>
                  <span className="shrink-0 text-right"><strong className="block text-gray-900">{product.quantity} vendu{product.quantity > 1 ? 's' : ''}</strong><span className="text-xs text-gray-500">{formatCurrency(product.revenue, currency)}</span></span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Stock à surveiller</h2>
            <Link to="/admin/produits?stock=low" className="text-sm font-medium text-brand-700">Voir le stock</Link>
          </div>
          <p className="mt-2 text-sm text-gray-500">{stats.outOfStockProducts} rupture{stats.outOfStockProducts > 1 ? 's' : ''} et {stats.lowStockProducts} produit{stats.lowStockProducts > 1 ? 's' : ''} sous le seuil défini.</p>
          <Link to="/admin/produits?stock=low" className="mt-5 inline-flex rounded-lg bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Ouvrir la liste du stock</Link>
        </div>
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
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats.recentOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    Aucune commande pour le moment.
                  </td>
                </tr>
              )}
              {stats.recentOrders.map((order) => {
                const next = getLinearNext(order.status)
                return (
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
                    <td className="px-4 py-3 text-right">
                      {next ? (
                        <button
                          onClick={() => statusMutation.mutate({ id: order.id, status: next })}
                          disabled={statusMutation.isPending}
                          className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60"
                        >
                          {ORDER_STATUS_ACTION_LABELS[next]}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Terminée</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}