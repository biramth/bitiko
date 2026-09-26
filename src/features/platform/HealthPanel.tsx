import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, RefreshCw, XCircle } from 'lucide-react'
import { getPlatformHealth } from '@/services/platform.service'
import { healthChecks, overallLevel, type HealthLevel } from '@/features/platform/healthAlerts'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { timeAgo } from '@/utils/format'

const LEVEL_STYLE: Record<HealthLevel, { icon: typeof CheckCircle2; box: string; text: string; label: string }> = {
  ok: { icon: CheckCircle2, box: 'border-emerald-200 bg-emerald-50', text: 'text-emerald-800', label: 'Tout fonctionne' },
  warning: { icon: AlertTriangle, box: 'border-amber-200 bg-amber-50', text: 'text-amber-800', label: 'À surveiller' },
  critical: { icon: XCircle, box: 'border-red-200 bg-red-50', text: 'text-red-800', label: 'Action requise' },
}

/** Santé technique : alertes qui ne partent pas, envois en échec, campagnes et paiements en retard. */
export function HealthPanel() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['platform-health'],
    queryFn: getPlatformHealth,
    retry: false,
    refetchInterval: 60_000,
  })

  if (isLoading) return <Spinner />
  if (isError || !data) return <p className="text-sm text-red-600">{error instanceof Error ? error.message : 'Erreur.'}</p>

  const checks = healthChecks(data)
  const level = overallLevel(checks)
  const style = LEVEL_STYLE[level]
  const Icon = style.icon

  return (
    <div className="space-y-6">
      <div className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${style.box}`}>
        <p className={`flex items-center gap-2 font-semibold ${style.text}`}>
          <Icon size={18} aria-hidden /> {style.label}
        </p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">Mis à jour {timeAgo(data.generated_at)}</span>
          <Button variant="secondary" size="sm" loading={isFetching} icon={<RefreshCw size={13} aria-hidden />} onClick={() => refetch()}>
            Actualiser
          </Button>
        </div>
      </div>

      <ul className="space-y-2">
        {checks.map((check) => {
          const s = LEVEL_STYLE[check.level]
          const CheckIcon = s.icon
          return (
            <li key={check.key} className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4">
              <CheckIcon size={18} className={`mt-0.5 shrink-0 ${check.level === 'ok' ? 'text-emerald-600' : check.level === 'warning' ? 'text-amber-600' : 'text-red-600'}`} aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{check.title}</p>
                <p className="mt-0.5 text-sm text-gray-500">{check.detail}</p>
              </div>
            </li>
          )
        })}
      </ul>

      {data.suspended_shops > 0 && (
        <p className="text-sm text-gray-500">
          {data.suspended_shops} boutique{data.suspended_shops > 1 ? 's' : ''} suspendue{data.suspended_shops > 1 ? 's' : ''} : voir la page Boutiques, filtre « Suspendues ».
        </p>
      )}

      {data.recent_failures.length > 0 && (
        <div>
          <h2 className="font-heading text-lg font-semibold text-gray-900">Derniers envois en échec</h2>
          <ul className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
            {data.recent_failures.map((failure, index) => (
              <li key={`${failure.created_at}-${index}`} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {failure.event_type} <span className="font-normal text-gray-500">— {failure.shop_name ?? 'boutique supprimée'}</span>
                  </p>
                  <p className="truncate font-mono text-xs text-red-600">{failure.error || 'erreur sans détail'}</p>
                </div>
                <time className="shrink-0 text-xs text-gray-400" dateTime={failure.created_at}>{timeAgo(failure.created_at)}</time>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
