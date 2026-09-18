import { PromosTool } from '@/features/platform/PromosTool'
import { PageHeader } from '@/components/ui/PageHeader'
import { usePageSeo } from '@/hooks/usePageSeo'

export function PlatformPromosPage() {
  usePageSeo({ title: 'Promotions — Bitiko', noindex: true })
  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      <PageHeader
        title="Promotions"
        subtitle="Offres d'abonnement offert que les commerçants activent depuis leur tableau de bord."
      />
      <div className="mt-6">
        <PromosTool />
      </div>
    </div>
  )
}
