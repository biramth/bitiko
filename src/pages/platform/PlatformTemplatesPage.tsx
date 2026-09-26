import { TemplatesTool } from '@/features/platform/TemplatesTool'
import { PageHeader } from '@/components/ui/PageHeader'
import { usePageSeo } from '@/hooks/usePageSeo'

export function PlatformTemplatesPage() {
  usePageSeo({ title: 'Gabarits — Bitiko', noindex: true })
  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      <PageHeader
        title="Gabarits"
        subtitle="Le catalogue visuel : compatibilités par type d'activité et surcharge de contenu sans déploiement. Les slugs sont immuables."
      />
      <div className="mt-6">
        <TemplatesTool />
      </div>
    </div>
  )
}
