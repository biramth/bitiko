import { PaymentsPanel } from '@/features/platform/panels'
import { PageHeader } from '@/components/ui/PageHeader'
import { usePageSeo } from '@/hooks/usePageSeo'

export function PlatformPaymentsPage() {
  usePageSeo({ title: 'Paiements — Bitiko', noindex: true })
  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      <PageHeader title="Paiements" subtitle="Vérification des preuves de paiement Wave." />
      <div className="mt-6">
        <PaymentsPanel />
      </div>
    </div>
  )
}
