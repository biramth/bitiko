import { HealthPanel } from '@/features/platform/HealthPanel'
import { PageHeader } from '@/components/ui/PageHeader'
import { usePageSeo } from '@/hooks/usePageSeo'

export function PlatformHealthPage() {
  usePageSeo({ title: 'Santé — Bitiko', noindex: true })
  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-8">
      <PageHeader title="Santé technique" subtitle="Ce qui est en panne ou en retard : alertes, envois d’emails, campagnes et paiements." />
      <div className="mt-6">
        <HealthPanel />
      </div>
    </div>
  )
}
