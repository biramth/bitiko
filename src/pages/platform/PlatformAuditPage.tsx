import { AuditPanel } from '@/features/platform/AuditPanel'
import { PageHeader } from '@/components/ui/PageHeader'
import { usePageSeo } from '@/hooks/usePageSeo'

export function PlatformAuditPage() {
  usePageSeo({ title: 'Journal — Bitiko', noindex: true })
  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-8">
      <PageHeader title="Journal" subtitle="Qui a fait quoi : accès support, paiements, offres d’abonnement, suppressions." />
      <div className="mt-6">
        <AuditPanel />
      </div>
    </div>
  )
}
