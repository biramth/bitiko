import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BarChart3,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Package,
  ShoppingBag,
  Store,
  Users,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { listPendingPayments, approvePayment, rejectPayment } from '@/services/admin.service'
import { getPlatformShops, getPlatformStats, type PlatformVisitsByDay } from '@/services/platform.service'
import { PLANS } from '@/config/plans'
import { formatCurrency } from '@/utils/format'
import { shopUrl } from '@/lib/tenant'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'

/**
 * Panels shared by the platform workspace pages. They used to be tabs inside
 * the single /super-admin page; each one now backs its own tool page under
 * /plateforme so a member only loads the tool their role grants.
 */

export const PLAN_LABELS: Record<string, string> = { free: 'Gratuit', essential: 'Essentiel', pro: 'Pro' }
export const PLAN_BADGE: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700',
  essential: 'bg-blue-100 text-blue-800',
  pro: 'bg-brand-100 text-brand-800',
}

export function MetricCard({ label, value, hint, icon: Icon }: { label: string; value: string; hint?: string; icon: LucideIcon }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Icon size={16} aria-hidden /> {label}
      </div>
      <p className="mt-1.5 text-2xl font-semibold text-gray-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

function RevenueList({ rows, fallback }: { rows: { currency: string; total: number }[]; fallback: string }) {
  if (rows.length === 0) return <p className="mt-1.5 text-2xl font-semibold text-gray-900">{fallback}</p>
  return (
    <div className="mt-1.5 space-y-0.5">
      {rows.map((row) => (
        <p key={row.currency} className="text-2xl font-semibold text-gray-900">
          {formatCurrency(row.total, row.currency)}
        </p>
      ))}
    </div>
  )
}

export function OverviewPanel({ stats }: { stats: Awaited<ReturnType<typeof getPlatformStats>> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <MetricCard icon={Store} label="Boutiques" value={String(stats.total_shops)} hint={`${stats.paid_shops} en offre payante`} />
      <MetricCard icon={Package} label="Produits" value={String(stats.total_products)} hint={`${stats.active_products} actifs`} />
      <MetricCard icon={ShoppingBag} label="Commandes" value={String(stats.total_orders)} hint={`${stats.orders_today} aujourd'hui`} />
      <MetricCard icon={Users} label="Visites (30 j)" value={String(stats.visits_30d)} hint={`${stats.visitors_30d} visiteurs uniques`} />
      <MetricCard icon={BarChart3} label="Visites aujourd'hui" value={String(stats.visits_today)} hint={`${stats.visitors_today} visiteurs uniques`} />
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <CreditCard size={16} aria-hidden /> Chiffre d'affaires
        </div>
        <RevenueList rows={stats.revenue_by_currency} fallback="0" />
        <p className="mt-1 text-xs text-gray-400">
          Aujourd'hui :{' '}
          {stats.revenue_today_by_currency.length > 0
            ? stats.revenue_today_by_currency.map((r) => formatCurrency(r.total, r.currency)).join(' · ')
            : '0'}
        </p>
      </div>
    </div>
  )
}

/** Last 14 calendar days, gap-filled, so the chart shows a fixed axis. */
function buildVisitSeries(rows: PlatformVisitsByDay[] | null) {
  const byDay = new Map((rows ?? []).map((row) => [row.day, row]))
  const series: { key: string; label: string; visits: number; visitors: number }[] = []
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  for (let i = 13; i >= 0; i--) {
    const d = new Date(cursor)
    d.setDate(cursor.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const row = byDay.get(key)
    series.push({
      key,
      label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      visits: row?.visits ?? 0,
      visitors: row?.visitors ?? 0,
    })
  }
  return series
}

function VisitsChart({ rows }: { rows: PlatformVisitsByDay[] | null }) {
  const series = useMemo(() => buildVisitSeries(rows), [rows])
  const max = Math.max(1, ...series.map((d) => d.visits))

  return (
    <div>
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-500" /> Visites</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-200" /> Visiteurs uniques</span>
      </div>
      <div className="mt-4 flex items-end gap-1.5">
        {series.map((d) => (
          <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-32 w-full items-end justify-center gap-0.5" title={`${d.visits} visites · ${d.visitors} visiteurs`}>
              <div className="w-2 rounded-t bg-brand-500" style={{ height: `${Math.max(2, (d.visits / max) * 128)}px` }} />
              <div className="w-2 rounded-t bg-brand-200" style={{ height: `${Math.max(2, (d.visitors / max) * 128)}px` }} />
            </div>
            <span className="text-[10px] text-gray-400">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RankList({ title, empty, rows }: { title: string; empty: string; rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">{empty}</p>
      ) : (
        <ol className="mt-3 space-y-2.5">
          {rows.map((row, index) => (
            <li key={`${row.label}-${index}`} className="text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="truncate text-gray-700">{row.label}</span>
                <span className="shrink-0 font-medium text-gray-900">{row.value}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-gray-100">
                <div className="h-1.5 rounded-full bg-brand-400" style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export function AnalyticsPanel({ stats }: { stats: Awaited<ReturnType<typeof getPlatformStats>> }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900">Visites des 14 derniers jours</h3>
        <p className="mt-1 text-xs text-gray-500">
          {stats.visits_7d} visites et {stats.visitors_7d} visiteurs uniques sur 7 jours.
        </p>
        <div className="mt-4">
          <VisitsChart rows={stats.visits_by_day} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <RankList
          title="Boutiques les plus visitées"
          empty="Aucune visite enregistrée."
          rows={(stats.top_shops ?? []).map((s) => ({ label: s.name, value: s.visits }))}
        />
        <RankList
          title="Sources de trafic"
          empty="Aucun référent externe."
          rows={(stats.top_referrers ?? []).map((r) => ({ label: r.referrer, value: r.visits }))}
        />
      </div>
    </div>
  )
}

export function ShopsPanel() {
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['platform-shops'], queryFn: getPlatformShops, retry: false })

  if (isLoading) return <Spinner />
  if (isError) return <p className="text-sm text-red-600">{error instanceof Error ? error.message : 'Erreur.'}</p>
  if (!data || data.length === 0) return <EmptyState icon={Store} title="Aucune boutique" />

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-100 text-gray-500">
          <tr>
            <th className="px-4 py-3 font-medium">Boutique</th>
            <th className="px-4 py-3 font-medium">WhatsApp</th>
            <th className="px-4 py-3 font-medium">Produits</th>
            <th className="px-4 py-3 font-medium">Commandes</th>
            <th className="px-4 py-3 font-medium">CA</th>
            <th className="px-4 py-3 font-medium">Offre</th>
            <th className="px-4 py-3 font-medium">Inscrite le</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((shop) => (
            <tr key={shop.id}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-gray-900">{shop.name}</span>
                  <a href={shopUrl(shop.slug)} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gray-700" aria-label={`Ouvrir ${shop.name}`}>
                    <ExternalLink size={13} aria-hidden />
                  </a>
                </div>
                <span className="text-xs text-gray-400">{shop.slug}</span>
              </td>
              <td className="px-4 py-3 text-gray-600">{shop.whatsapp_number ?? '—'}</td>
              <td className="px-4 py-3 text-gray-600">{shop.products}</td>
              <td className="px-4 py-3 text-gray-600">{shop.orders}</td>
              <td className="px-4 py-3 text-gray-600">{formatCurrency(Number(shop.revenue), shop.currency)}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${PLAN_BADGE[shop.plan] ?? PLAN_BADGE.free}`}>
                  {PLAN_LABELS[shop.plan] ?? shop.plan}
                </span>
                {shop.plan_status === 'past_due' && <span className="ml-1.5 text-xs text-amber-600">paiement en retard</span>}
              </td>
              <td className="px-4 py-3 text-gray-600">{new Date(shop.created_at).toLocaleDateString('fr-FR')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function PaymentsPanel() {
  const queryClient = useQueryClient()
  const { data: payments, isLoading, isError, error } = useQuery({
    queryKey: ['admin-pending-payments'],
    queryFn: listPendingPayments,
    retry: false,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-pending-payments'] })
  const approve = useMutation({
    mutationFn: ({ paymentId, plan }: { paymentId: string; plan: 'essential' | 'pro' }) => approvePayment(paymentId, plan),
    onSuccess: invalidate,
  })
  const reject = useMutation({ mutationFn: rejectPayment, onSuccess: invalidate })

  if (isLoading) return <Spinner />
  if (isError) return <p className="text-sm text-red-600">{error instanceof Error ? error.message : 'Erreur.'}</p>

  return (
    <div>
      <p className="text-sm text-gray-500">
        Paiements Wave en attente de vérification manuelle. Contrôle le montant réellement reçu dans l'app Wave, puis
        active le plan correspondant.
      </p>

      {payments && payments.length === 0 && (
        <div className="mt-6">
          <EmptyState icon={CheckCircle2} title="Aucun paiement en attente" description="Tout est à jour." />
        </div>
      )}

      {payments && payments.length > 0 && (
        <div className="mt-4 space-y-3">
          {payments.map((payment) => (
            <div key={payment.id} className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-heading font-semibold text-gray-900">{payment.shop?.name ?? 'Boutique supprimée'}</p>
                  {payment.shop && (
                    <a href={shopUrl(payment.shop.slug)} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gray-700">
                      <ExternalLink size={14} aria-hidden />
                    </a>
                  )}
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${PLAN_BADGE[payment.plan] ?? PLAN_BADGE.free}`}>
                    {PLAN_LABELS[payment.plan] ?? payment.plan}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-gray-500">
                  {formatCurrency(payment.amount, payment.currency)} · {new Date(payment.created_at).toLocaleString('fr-FR')}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  WhatsApp : {payment.shop?.whatsapp_number ?? '—'} · Email : {payment.ownerEmail ?? '—'}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-1.5 sm:items-end">
                <p className="text-xs text-gray-400">Montant déclaré par le commerçant — à vérifier dans Wave.</p>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => reject.mutate(payment.id)}
                    disabled={approve.isPending || reject.isPending}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                  >
                    <XCircle size={15} aria-hidden /> Rejeter
                  </button>
                  <button
                    type="button"
                    onClick={() => approve.mutate({ paymentId: payment.id, plan: 'essential' })}
                    disabled={approve.isPending || reject.isPending}
                    className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100 disabled:opacity-60"
                  >
                    <CheckCircle2 size={15} aria-hidden /> Activer Essentiel · {formatCurrency(PLANS.essential.priceXof, 'XOF')}
                  </button>
                  <button
                    type="button"
                    onClick={() => approve.mutate({ paymentId: payment.id, plan: 'pro' })}
                    disabled={approve.isPending || reject.isPending}
                    className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                  >
                    <CheckCircle2 size={15} aria-hidden /> Activer Pro · {formatCurrency(PLANS.pro.priceXof, 'XOF')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(approve.isError || reject.isError) && (
        <p className="mt-4 text-sm text-red-600">
          {(approve.error ?? reject.error) instanceof Error ? ((approve.error ?? reject.error) as Error).message : 'Erreur.'}
        </p>
      )}
    </div>
  )
}