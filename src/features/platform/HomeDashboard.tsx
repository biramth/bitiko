import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ChevronRight, XCircle } from 'lucide-react'
import { getPlatformHealth, getPlatformShops, getPlatformStats } from '@/services/platform.service'
import { listPendingPayments } from '@/services/admin.service'
import { usePlatformRole } from '@/features/platform/usePlatformRole'
import { can } from '@/features/platform/permissions'
import { summarizeSubscriptions } from '@/features/platform/shopsInsights'
import { buildHomeTodos, type HomeTodo } from '@/features/platform/homeTodos'
import { VisitsChart } from '@/features/platform/panels'
import type { HealthLevel } from '@/features/platform/healthAlerts'
import { formatCurrency } from '@/utils/format'
import { Spinner } from '@/components/ui/Spinner'

const LEVEL_ICON: Record<HealthLevel, { icon: typeof CheckCircle2; className: string }> = {
  ok: { icon: CheckCircle2, className: 'text-emerald-600' },
  warning: { icon: AlertTriangle, className: 'text-amber-600' },
  critical: { icon: XCircle, className: 'text-red-600' },
}

function Kpi({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="min-w-0 px-4 py-3">
      <p className="truncate text-xs font-medium text-gray-500">{label}</p>
      <div className="mt-0.5 truncate text-xl font-semibold text-gray-900">{value}</div>
      {hint && <p className="truncate text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

function TodoRow({ todo }: { todo: HomeTodo }) {
  const { icon: Icon, className } = LEVEL_ICON[todo.level]
  return (
    <li>
      <Link to={todo.to} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
        <Icon size={17} className={`shrink-0 ${className}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900">
            {todo.label}
            {todo.count > 0 && <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">{todo.count}</span>}
          </p>
          <p className="truncate text-xs text-gray-500">{todo.detail}</p>
        </div>
        <ChevronRight size={15} className="shrink-0 text-gray-300" aria-hidden />
      </Link>
    </li>
  )
}

/** Vue d'ensemble compacte : les chiffres clés sur une ligne, ce qui demande une action, le trafic. Tient sur un écran. */
export function HomeDashboard() {
  const { data: role } = usePlatformRole()
  const stats = useQuery({ queryKey: ['platform-stats'], queryFn: getPlatformStats, retry: false, enabled: can(role, 'view_analytics') })
  const shops = useQuery({ queryKey: ['platform-shops'], queryFn: getPlatformShops, retry: false, enabled: can(role, 'view_shops') })
  const payments = useQuery({ queryKey: ['admin-pending-payments'], queryFn: listPendingPayments, retry: false, enabled: can(role, 'manage_payments') })
  const health = useQuery({ queryKey: ['platform-health'], queryFn: getPlatformHealth, retry: false, enabled: can(role, 'view_health') })

  const subscriptions = useMemo(() => (shops.data ? summarizeSubscriptions(shops.data) : undefined), [shops.data])
  const todos = useMemo(
    () => buildHomeTodos({ pendingPayments: payments.data?.length, subscriptions, health: health.data, shops: shops.data }),
    [payments.data, subscriptions, health.data, shops.data],
  )

  if (stats.isLoading) return <Spinner />
  if (stats.isError || !stats.data) return <p className="text-sm text-red-600">{stats.error instanceof Error ? stats.error.message : 'Erreur.'}</p>
  const s = stats.data
  const revenue = s.revenue_by_currency.length > 0 ? s.revenue_by_currency.map((r) => formatCurrency(r.total, r.currency)).join(' · ') : '0'

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white lg:grid-cols-5 lg:divide-y-0">
        <Kpi label="Boutiques" value={s.total_shops} hint={`${s.paid_shops} payante${s.paid_shops > 1 ? 's' : ''}`} />
        <Kpi label="Revenu mensuel" value={subscriptions ? formatCurrency(subscriptions.mrr, 'XOF') : '—'} hint="abonnements en cours" />
        <Kpi label="Commandes" value={s.total_orders} hint={`${s.orders_today} aujourd’hui`} />
        <Kpi label="Visites (30 j)" value={s.visits_30d} hint={`${s.visits_today} aujourd’hui`} />
        <div className="col-span-2 lg:col-span-1">
          <Kpi label="Ventes des commerçants" value={<span className="text-base">{revenue}</span>} hint={`${s.total_products} produits en ligne`} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white lg:col-span-2" aria-label="À traiter">
          <h2 className="border-b border-gray-100 px-4 py-3 font-heading text-sm font-semibold text-gray-900">À traiter maintenant</h2>
          {todos.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-500">Aucune source accessible avec votre rôle.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {todos.map((todo) => <TodoRow key={todo.key} todo={todo} />)}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4 lg:col-span-3" aria-label="Trafic">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-heading text-sm font-semibold text-gray-900">Visites des 14 derniers jours</h2>
            <Link to="/plateforme/analytiques" className="text-xs font-medium text-brand-700 hover:text-brand-800">Détail</Link>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">{s.visits_7d} visites · {s.visitors_7d} visiteurs uniques sur 7 jours</p>
          <div className="mt-3">
            <VisitsChart rows={s.visits_by_day} />
          </div>
        </section>
      </div>
    </div>
  )
}
