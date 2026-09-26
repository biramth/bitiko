import { CountriesTool } from '@/features/platform/CountriesTool'
import { PageHeader } from '@/components/ui/PageHeader'
import { usePageSeo } from '@/hooks/usePageSeo'

export function PlatformCountriesPage() {
  usePageSeo({ title: 'Pays — Bitiko', noindex: true })
  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      <PageHeader title="Pays" subtitle="Quels pays sont ouverts aux boutiques Bitiko, et leur devise." />
      <div className="mt-6">
        <CountriesTool />
      </div>
    </div>
  )
}