import { BusinessTypesTool } from '@/features/platform/BusinessTypesTool'
import { PageHeader } from '@/components/ui/PageHeader'
import { usePageSeo } from '@/hooks/usePageSeo'

export function PlatformBusinessTypesPage() {
  usePageSeo({ title: 'Types d’activité — Bitiko', noindex: true })
  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      <PageHeader
        title="Types d’activité"
        subtitle="Le catalogue métier : chaque type déclare ses capabilities, qui adapteront le workspace et le frontstore. Les slugs sont immuables."
      />
      <div className="mt-6">
        <BusinessTypesTool />
      </div>
    </div>
  )
}
