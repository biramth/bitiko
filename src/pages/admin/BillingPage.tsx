import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, CheckCircle2, Clock, CreditCard, Loader2, ShieldCheck, XCircle } from 'lucide-react'
import { getShopSubscription, listPayments, requestPlanUpgrade, confirmPayment } from '@/services/billing.service'
import { PLANS, WAVE_ESSENTIAL_PAYMENT_LINK, WAVE_PRO_PAYMENT_LINK, effectivePlan, effectivePlanKey } from '@/config/plans'
import type { PlanKey } from '@/types/billing'
import { formatCurrency } from '@/utils/format'
import { PageLoader } from '@/components/ui/PageLoader'
import { useToast } from '@/components/ui/Toast'

function PlanFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-gray-700">
      <Check size={16} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden />
      {children}
    </li>
  )
}

/** Rendered as SettingsPage's "Facturation" section — Paramètres owns the
 *  page chrome (title/SEO) there, so this is just the billing content. */
export function BillingForShop({ shopId }: { shopId: string }) {
  const queryClient = useQueryClient()
  const toast = useToast()
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
          toast.success('Paiement confirmé — votre abonnement est activé.')
        } else if (result.status === 'failed') {
          setConfirmError("Le paiement n'a pas abouti. Vous pouvez réessayer.")
          toast.error("Le paiement n'a pas abouti. Vous pouvez réessayer.")
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

  const upgradeRequestMutation = useMutation({
    mutationFn: (planKey: Exclude<PlanKey, 'free'>) => requestPlanUpgrade(shopId, planKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wave-payments', shopId] })
      toast.success('Demande envoyée. Votre upgrade sera activé après vérification.')
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Impossible d'envoyer la demande. Réessayez."),
  })

  if (isLoading) return <PageLoader />

  const planKey = effectivePlanKey(subscription)
  const plan = effectivePlan(subscription)
  const pendingManualRequest = payments.find(
    (p) => p.status === 'pending' && p.client_reference.startsWith('manual_'),
  )

  return (
    <div className="mt-6 max-w-3xl">
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
        {planKey !== 'free' && subscription?.current_period_end && (
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

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {(['free', 'essential', 'pro'] as const).map((key) => {
          const tier = PLANS[key]
          const isCurrent = planKey === key
          const paymentLink = key === 'essential' ? WAVE_ESSENTIAL_PAYMENT_LINK : WAVE_PRO_PAYMENT_LINK
          const features = key === 'free'
            ? [
                `Jusqu'à ${tier.maxActiveProducts} produits actifs`,
                `Personnalisation de base (${tier.maxCustomSections} blocs de contenu)`,
                'Commandes via WhatsApp',
              ]
            : key === 'essential'
              ? [
                  'Jusqu’à 50 produits actifs',
                  `Builder complet (${tier.maxCustomSections} blocs de contenu) et pages personnalisées`,
                  'Analytics standard et import CSV',
                ]
              : [
                  'Produits illimités',
                  'Personnalisation illimitée (blocs et pages) et styles avancés',
                  'Analytics avancées et branding retiré',
                ]

          return (
            <div key={key} className={`rounded-xl bg-white p-5 ${key === 'essential' ? 'border-2 border-brand-500 shadow-sm' : 'border border-gray-200'}`}>
              {key === 'essential' && <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand-600">Le plus choisi</p>}
              <p className="font-heading font-semibold text-gray-900">{tier.label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {tier.priceXof === 0 ? 'Gratuit' : formatCurrency(tier.priceXof, 'XOF')}
                {tier.priceXof > 0 && <span className="text-sm font-normal text-gray-500"> / mois</span>}
              </p>
              <ul className="mt-4 space-y-2">
                {features.map((feature) => <PlanFeature key={feature}>{feature}</PlanFeature>)}
              </ul>
              {isCurrent ? (
                <p className="mt-5 rounded-lg bg-emerald-50 px-3 py-2 text-center text-xs font-medium text-emerald-700">Plan actuel</p>
              ) : key === 'free' ? (
                <p className="mt-5 rounded-lg bg-gray-50 px-3 py-2 text-center text-xs font-medium text-gray-500">Disponible au démarrage</p>
              ) : pendingManualRequest ? (
                <div className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-700"><Clock size={14} /> Paiement en vérification</div>
              ) : (
                <div className="mt-5 space-y-2">
                  <a href={paymentLink} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
                    <CreditCard size={15} /> Payer avec Wave
                  </a>
                  <button type="button" onClick={() => upgradeRequestMutation.mutate(key)} disabled={upgradeRequestMutation.isPending} className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60">
                    {upgradeRequestMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    J'ai payé, activer
                  </button>
                </div>
              )}
              {upgradeRequestMutation.isError && !isCurrent && <p className="mt-2 text-xs text-red-600">Impossible d'envoyer la demande.</p>}
            </div>
          )
        })}
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
