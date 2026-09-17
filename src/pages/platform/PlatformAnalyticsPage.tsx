import { useQuery } from '@tanstack/react-query'
import { getPlatformStats } from '@/services/platform.service'
import { AnalyticsPanel } from '@/features/platform/panels'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { usePageSeo } from '@/hooks/usePageSeo'

export function PlatformAnalyticsPage() {
  usePageSeo({ title: 'Analytiques — Bitiko', noindex: true })
  const stats = useQuery({ queryKey: ['platform-stats'], queryFn: getPlatformStats, retry: false })

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      <PageHeader title="Analytiques" subtitle="Trafic et usage de la plateforme." />
      <div className="mt-6">
        {stats.isLoading && <Spinner />}
        {stats.isError && <p className="text-sm text-red-600">{stats.error instanceof Error ? stats.error.message : 'Erreur.'}</p>}
        {stats.data && <AnalyticsPanel stats={stats.data} />}
      </div>
    </div>
  )
}
