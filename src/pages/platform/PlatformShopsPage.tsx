import { ShopsPanel } from '@/features/platform/panels'
import { PageHeader } from '@/components/ui/PageHeader'
import { usePageSeo } from '@/hooks/usePageSeo'

export function PlatformShopsPage() {
  usePageSeo({ title: 'Boutiques — Bitiko', noindex: true })
  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      <PageHeader title="Boutiques" subtitle="Toutes les boutiques de la plateforme." />
      <div className="mt-6">
        <ShopsPanel />
      </div>
    </div>
  )
}
