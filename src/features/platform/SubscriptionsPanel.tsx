import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarClock, Coins, Gift, MessageCircle, TrendingUp, Users } from 'lucide-react'
import { getPlatformShops, type PlatformShop } from '@/services/platform.service'
import { usePlatformRole } from '@/features/platform/usePlatformRole'
import { can } from '@/features/platform/permissions'
import { GrantSubscriptionDialog } from '@/features/platform/GrantSubscriptionDialog'
import { daysLeft, renewalWhatsAppUrl, summarizeSubscriptions } from '@/features/platform/shopsInsights'
import { MetricCard } from '@/features/platform/panels'
import { PLAN_BADGE, PLAN_LABELS } from '@/config/plans'
import { formatCurrency } from '@/utils/format'
import { Spinner } from '@/components/ui/Spinner'

function RenewalList({
  title,
  empty,
  shops,
  canGrant,
  onGrant,
}: {
  title: string
  empty: string
  shops: PlatformShop[]
  canGrant: boolean
  onGrant: (shop: PlatformShop) => void
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="font-heading text-base font-semibold text-gray-900">{title}</h3>
      {shops.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">{empty}</p>
      ) : (
        <ul className="mt-2 divide-y divide-gray-100">
          {shops.map((shop) => {
            const left = daysLeft(shop) ?? 0
            const url = renewalWhatsAppUrl(shop)
            return (
              <li key={shop.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-gray-900">
                    <span className="truncate">{shop.name}</span>
                    <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_BADGE[shop.subscribed_plan] ?? PLAN_BADGE.free}`}>
                      {PLAN_LABELS[shop.subscribed_plan] ?? shop.subscribed_plan}
                    </span>
                  </p>
                  <p className={`text-xs ${left < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                    {left < 0 ? `Échu depuis ${Math.abs(left)} j` : left === 0 ? 'Expire aujourd’hui' : `Expire dans ${left} j`}
                    <span className="text-gray-400"> · {shop.owner_email ?? shop.whatsapp_number ?? '—'}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {url && (
                    <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100">
                      <MessageCircle size={13} aria-hidden /> Relancer
                    </a>
                  )}
                  {canGrant && (
                    <button type="button" onClick={() => onGrant(shop)} className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                      <Gift size={13} aria-hidden /> Offrir
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** Santé des abonnements : revenu récurrent, répartition des plans, renouvellements à suivre. */
export function SubscriptionsPanel() {
  const { data: role } = usePlatformRole()
  const [grantShop, setGrantShop] = useState<PlatformShop | null>(null)
  const { data, isLoading, isError } = useQuery({ queryKey: ['platform-shops'], queryFn: getPlatformShops, retry: false })
  const summary = useMemo(() => summarizeSubscriptions(data ?? []), [data])
  const canGrant = can(role, 'manage_payments')

  if (isLoading) return <Spinner />
  if (isError || !data) return null

  const total = data.length || 1
  return (
    <section aria-label="Abonnements" className="mb-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Coins} label="Revenu mensuel récurrent" value={formatCurrency(summary.mrr, 'XOF')} hint="abonnements payants en cours" />
        <MetricCard icon={Users} label="Boutiques payantes" value={String(summary.payingShops)} hint={`${summary.paidShare} % des ${data.length} boutiques`} />
        <MetricCard icon={CalendarClock} label="À renouveler (7 j)" value={String(summary.expiringSoon.length)} hint="relancez avant l’échéance" />
        <MetricCard icon={TrendingUp} label="Échus (30 j)" value={String(summary.recentlyExpired.length)} hint="revenus à récupérer" />
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex h-3 overflow-hidden rounded-full bg-gray-100" role="img" aria-label={`Gratuit ${summary.byPlan.free}, Essentiel ${summary.byPlan.essential}, Pro ${summary.byPlan.pro}`}>
          <div className="bg-gray-300" style={{ width: `${(summary.byPlan.free / total) * 100}%` }} />
          <div className="bg-blue-400" style={{ width: `${(summary.byPlan.essential / total) * 100}%` }} />
          <div className="bg-brand-500" style={{ width: `${(summary.byPlan.pro / total) * 100}%` }} />
        </div>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          <span>Gratuit : <strong className="text-gray-800">{summary.byPlan.free}</strong></span>
          <span>Essentiel : <strong className="text-gray-800">{summary.byPlan.essential}</strong></span>
          <span>Pro : <strong className="text-gray-800">{summary.byPlan.pro}</strong></span>
        </p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <RenewalList title="À renouveler bientôt" empty="Aucun abonnement n’arrive à échéance dans les 7 jours." shops={summary.expiringSoon} canGrant={canGrant} onGrant={setGrantShop} />
        <RenewalList title="Échus récemment" empty="Aucun abonnement échu ces 30 derniers jours." shops={summary.recentlyExpired} canGrant={canGrant} onGrant={setGrantShop} />
      </div>

      <GrantSubscriptionDialog shop={grantShop} onClose={() => setGrantShop(null)} />
    </section>
  )
}
