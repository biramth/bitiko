import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ExternalLink, ShieldAlert, XCircle } from 'lucide-react'
import { listPendingPayments, approvePayment, rejectPayment } from '@/services/admin.service'
import { formatCurrency } from '@/utils/format'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { usePageSeo } from '@/hooks/usePageSeo'

/**
 * Platform-operator tool (not a merchant dashboard) — reachable only at
 * /super-admin, unlinked from any merchant-facing nav. Access is enforced
 * server-side (api/admin/*, see getPlatformAdminFromAuthHeader); a non-admin
 * landing here just sees "Accès réservé", nothing sensitive leaks.
 *
 * Today: approving the Wave manual-bridge payments (api/request-pro-upgrade.ts).
 * More platform-wide tools can grow here later.
 */
export function SuperAdminPage() {
  usePageSeo({ title: 'Super admin — Bitiko', noindex: true })
  const queryClient = useQueryClient()

  const { data: payments, isLoading, isError, error } = useQuery({
    queryKey: ['admin-pending-payments'],
    queryFn: listPendingPayments,
    retry: false,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-pending-payments'] })

  const approve = useMutation({ mutationFn: approvePayment, onSuccess: invalidate })
  const reject = useMutation({ mutationFn: rejectPayment, onSuccess: invalidate })

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-8">
      <PageHeader title="Super admin" subtitle="Paiements Wave en attente de vérification manuelle." />

      {isLoading && <Spinner />}

      {isError && (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-8 text-center">
          <ShieldAlert size={28} className="text-gray-300" aria-hidden />
          <p className="text-sm text-gray-500">
            {error instanceof Error ? error.message : 'Accès réservé.'}
          </p>
        </div>
      )}

      {payments && payments.length === 0 && (
        <div className="mt-6">
          <EmptyState icon={CheckCircle2} title="Aucun paiement en attente" description="Tout est à jour." />
        </div>
      )}

      {payments && payments.length > 0 && (
        <div className="mt-6 space-y-3">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-heading font-semibold text-gray-900">{payment.shop?.name ?? 'Boutique supprimée'}</p>
                  {payment.shop && (
                    <a
                      href={`https://${payment.shop.slug}.bitiko.shop`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-gray-400 hover:text-gray-700"
                    >
                      <ExternalLink size={14} aria-hidden />
                    </a>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-gray-500">
                  {formatCurrency(payment.amount, payment.currency)} · plan {payment.plan} ·{' '}
                  {new Date(payment.created_at).toLocaleString('fr-FR')}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  WhatsApp : {payment.shop?.whatsapp_number ?? '—'} · Email : {payment.ownerEmail ?? '—'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => reject.mutate(payment.id)}
                  disabled={approve.isPending || reject.isPending}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                >
                  <XCircle size={15} aria-hidden /> Rejeter
                </button>
                <button
                  type="button"
                  onClick={() => approve.mutate(payment.id)}
                  disabled={approve.isPending || reject.isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  <CheckCircle2 size={15} aria-hidden /> Activer le Pro
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(approve.isError || reject.isError) && (
        <p className="mt-4 text-sm text-red-600">
          {(approve.error ?? reject.error) instanceof Error
            ? ((approve.error ?? reject.error) as Error).message
            : 'Erreur.'}
        </p>
      )}
    </div>
  )
}
