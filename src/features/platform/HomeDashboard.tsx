import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ChevronRight, ShoppingBag, Store, TrendingUp, Users, Wallet, XCircle, type LucideIcon } from 'lucide-react'
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

const LEVEL_STYLE: Record<HealthLevel, { icon: typeof CheckCircle2; pill: string; dot: string }> = {
  ok: { icon: CheckCircle2, pill: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  warning: { icon: AlertTriangle, pill: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
  critical: { icon: XCircle, pill: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
}

function Kpi({ icon: Icon, label, value, hint, accent }: { icon: LucideIcon; label: string; value: React.ReactNode; hint?: string; accent: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent}`}>
          <Icon size={15} aria-hidden />
        </span>
        <p className="truncate text-[13px] font-medium text-gray-500">{label}</p>
      </div>
      <div className="mt-2 truncate text-[22px] font-bold tracking-tight text-gray-900 tabular-nums">{value}</div>
      {hint && <p className="mt-0.5 truncate text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

function TodoRow({ todo }: { todo: HomeTodo }) {
  const { icon: Icon, pill } = LEVEL_STYLE[todo.level]
  return (
    <li>
      <Link to={todo.to} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-gray-50">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${pill}`}>
          <Icon size={15} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900">
            {todo.label}
            {todo.count > 0 && <span className="rounded-full bg-ink-900 px-2 py-0.5 text-[11px] font-bold text-white tabular-nums">{todo.count}</span>}
          </p>
          <p className="truncate text-xs text-gray-500">{todo.detail}</p>
        </div>
        <ChevronRight size={15} className="shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500" aria-hidden />
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
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <Kpi icon={Store} accent="bg-ink-900/[0.06] text-ink-800" label="Boutiques" value={s.total_shops} hint={`${s.paid_shops} payante${s.paid_shops > 1 ? 's' : ''}`} />
        <Kpi icon={TrendingUp} accent="bg-emerald-100 text-emerald-700" label="Revenu mensuel" value={subscriptions ? formatCurrency(subscriptions.mrr, 'XOF') : '—'} hint="abonnements en cours" />
        <Kpi icon={ShoppingBag} accent="bg-brand-100 text-brand-700" label="Commandes" value={s.total_orders} hint={`${s.orders_today} aujourd’hui`} />
        <Kpi icon={Users} accent="bg-sky-100 text-sky-700" label="Visites (30 j)" value={s.visits_30d} hint={`${s.visits_today} aujourd’hui`} />
        <div className="col-span-2 lg:col-span-1">
          <Kpi icon={Wallet} accent="bg-violet-100 text-violet-700" label="Ventes commerçants" value={<span className="text-lg">{revenue}</span>} hint={`${s.total_products} produits en ligne`} />
        </div>
      </div>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-5">
        <section className="rounded-2xl border border-gray-200 bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:col-span-2" aria-label="À traiter">
          <h2 className="px-2 pb-1 pt-1 font-heading text-sm font-semibold text-gray-900">À traiter maintenant</h2>
          {todos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/70 px-4 py-6 text-center text-sm text-gray-500">
              Aucune source accessible avec votre rôle.
            </div>
          ) : (
            <ul className="space-y-0.5">
              {todos.map((todo) => <TodoRow key={todo.key} todo={todo} />)}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5 lg:col-span-3" aria-label="Trafic">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-sm font-semibold text-gray-900">Visites des 14 derniers jours</h2>
            <Link to="/plateforme/analytiques" className="inline-flex items-center gap-0.5 rounded-lg px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50">Détail <ChevronRight size={13} aria-hidden /></Link>
          </div>
          <p className="mt-1 text-xs tabular-nums text-gray-500">{s.visits_7d} visites · {s.visitors_7d} visiteurs uniques sur 7 jours</p>
          <div className="mt-4">
            <VisitsChart rows={s.visits_by_day} />
          </div>
        </section>
      </div>
    </div>
  )
}
