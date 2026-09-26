import { HomeDashboard } from '@/features/platform/HomeDashboard'
import { PageHeader } from '@/components/ui/PageHeader'
import { usePageSeo } from '@/hooks/usePageSeo'

export function PlatformHomePage() {
  usePageSeo({ title: 'Espace plateforme — Bitiko', noindex: true })

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      <PageHeader title="Vue d'ensemble" subtitle="Ce qui demande votre attention, puis les chiffres clés." />
      <div className="mt-5">
        <HomeDashboard />
      </div>
    </div>
  )
}
