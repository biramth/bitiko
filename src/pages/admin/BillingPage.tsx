import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, CreditCard, Loader2, ShieldCheck, XCircle } from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { getShopSubscription, listPayments, createProCheckout, confirmPayment } from '@/services/billing.service'
import { PLANS, effectivePlan, effectivePlanKey } from '@/config/plans'
import { formatCurrency } from '@/utils/format'
import { Spinner } from '@/components/ui/Spinner'
import { usePageSeo } from '@/hooks/usePageSeo'
import { PageHeader } from '@/components/ui/PageHeader'

function PlanFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-gray-700">
      <Check size={16} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden />
      {children}
    </li>
  )
}

export function BillingPage() {
  usePageSeo({ title: 'Facturation — Bitiko', noindex: true })
  const { data: shop, isLoading: shopLoading } = useMyShop()

  if (shopLoading) return <Spinner />
  if (!shop) return <p className="text-sm text-gray-500">Aucune boutique configurée.</p>

  return <BillingForShop key={shop.id} shopId={shop.id} />
}

function BillingForShop({ shopId }: { shopId: string }) {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['shop-subscription', shopId],
    queryFn: () => getShopSubscription(shopId),
  })

  const { data: payments = [] } = useQuery({
    queryKey: ['wave-payments', shopId],
    queryFn: () => listPayments(shopId),
  })

  const reference = searchParams.get('reference')
  const paymentFailed = searchParams.get('paiement') === 'echec'

  useEffect(() => {
    if (!reference) return
    setConfirming(true)
    confirmPayment(reference)
      .then((result) => {
        if (result.status === 'succeeded') {
          queryClient.invalidateQueries({ queryKey: ['shop-subscription', shopId] })
          queryClient.invalidateQueries({ queryKey: ['wave-payments', shopId] })
        } else if (result.status === 'failed') {
          setConfirmError("Le paiement n'a pas abouti. Vous pouvez réessayer.")
        } else {
          setConfirmError('Paiement en cours de traitement — actualisez dans un instant.')
        }
      })
      .catch((err) => setConfirmError(err instanceof Error ? err.message : 'Erreur de vérification.'))
      .finally(() => {
        setConfirming(false)
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev)
          next.delete('reference')
          return next
        })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference])

  const checkoutMutation = useMutation({
    mutationFn: () => createProCheckout(shopId),
    onSuccess: ({ waveLaunchUrl }) => {
      window.location.href = waveLaunchUrl
    },
  })

  if (isLoading) return <Spinner />

  const planKey = effectivePlanKey(subscription)
  const plan = effectivePlan(subscription)
  const isPro = planKey === 'pro'

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Facturation" subtitle="Votre abonnement Bitiko et votre historique de paiement." />

      {confirming && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
          <Loader2 size={16} className="animate-spin" /> Vérification du paiement…
        </div>
      )}
      {!confirming && confirmError && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <XCircle size={16} /> {confirmError}
        </div>
      )}
      {paymentFailed && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <XCircle size={16} /> Le paiement a été annulé ou a échoué.
        </div>
      )}

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <ShieldCheck size={20} aria-hidden />
          </span>
          <div>
            <p className="text-sm text-gray-500">Plan actuel</p>
            <p className="font-heading text-lg font-semibold text-gray-900">{plan.label}</p>
          </div>
        </div>
        {isPro && subscription?.current_period_end && (
          <p className="mt-3 text-sm text-gray-500">
            Actif jusqu'au{' '}
            {new Date(subscription.current_period_end).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="font-heading font-semibold text-gray-900">{PLANS.free.label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">Gratuit</p>
          <ul className="mt-4 space-y-2">
            <PlanFeature>Jusqu'à {PLANS.free.maxActiveProducts} produits actifs</PlanFeature>
            <PlanFeature>Thème "Classic"</PlanFeature>
            <PlanFeature>Sous-domaine bitiko.shop</PlanFeature>
          </ul>
          {!isPro && (
            <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-center text-xs font-medium text-gray-500">
              Plan actuel
            </p>
          )}
        </div>

        <div className="rounded-xl border-2 border-brand-500 bg-white p-5">
          <p className="font-heading font-semibold text-gray-900">{PLANS.pro.label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {formatCurrency(PLANS.pro.priceXof, 'XOF')}
            <span className="text-sm font-normal text-gray-500"> / mois</span>
          </p>
          <ul className="mt-4 space-y-2">
            <PlanFeature>Produits illimités</PlanFeature>
            <PlanFeature>Éditeur visuel complet + tous les templates</PlanFeature>
            <PlanFeature>Retirer "Propulsé par Bitiko"</PlanFeature>
            <PlanFeature>Domaine personnalisé</PlanFeature>
          </ul>
          {isPro ? (
            <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-center text-xs font-medium text-emerald-700">
              Plan actuel
            </p>
          ) : (
            <button
              type="button"
              onClick={() => checkoutMutation.mutate()}
              disabled={checkoutMutation.isPending}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {checkoutMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
              Passer à Pro
            </button>
          )}
          {checkoutMutation.isError && (
            <p className="mt-2 text-xs text-red-600">
              {checkoutMutation.error instanceof Error ? checkoutMutation.error.message : 'Erreur.'}
            </p>
          )}
        </div>
      </div>

      {payments.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Montant</th>
                <th className="px-4 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-3">{new Date(payment.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3 capitalize">{payment.plan}</td>
                  <td className="px-4 py-3">{formatCurrency(Number(payment.amount), payment.currency)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        payment.status === 'succeeded'
                          ? 'bg-emerald-100 text-emerald-800'
                          : payment.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {payment.status === 'succeeded' ? 'Payé' : payment.status === 'failed' ? 'Échoué' : 'En attente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
