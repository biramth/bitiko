import { PaymentsPanel } from '@/features/platform/panels'
import { SubscriptionsPanel } from '@/features/platform/SubscriptionsPanel'
import { PageHeader } from '@/components/ui/PageHeader'
import { usePageSeo } from '@/hooks/usePageSeo'

export function PlatformPaymentsPage() {
  usePageSeo({ title: 'Paiements — Bitiko', noindex: true })
  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      <PageHeader title="Paiements" subtitle="Abonnements, renouvellements et vérification des preuves de paiement Wave." />
      <div className="mt-6">
        <SubscriptionsPanel />
        <h2 className="mb-3 font-heading text-lg font-semibold text-gray-900">Preuves à vérifier</h2>
        <PaymentsPanel />
      </div>
    </div>
  )
}
