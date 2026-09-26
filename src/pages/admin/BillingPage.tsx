import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { Check, CheckCircle2, Clock, CreditCard, Loader2, ShieldCheck, XCircle } from 'lucide-react'
import { getShopSubscription, listPayments, confirmPayment } from '@/services/billing.service'
import { PaymentProofDialog } from '@/features/billing/PaymentProofDialog'
import { PromoOfferCard } from '@/features/billing/PromoOfferCard'
import { useRedeemPromo } from '@/features/billing/useRedeemPromo'
import { PLANS, WAVE_ESSENTIAL_PAYMENT_LINK, WAVE_PRO_PAYMENT_LINK, effectivePlan, effectivePlanKey } from '@/config/plans'
import type { PlanKey } from '@/types/billing'
import { formatCurrency } from '@/utils/format'
import { PageLoader } from '@/components/ui/PageLoader'
import { Dialog } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'

function PlanFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-gray-700">
      <Check size={16} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden />
      {children}
    </li>
  )
}

/** Touch-primary devices (phones/tablets) can deep-link straight into the
 *  Wave app from a plain link tap; a mouse-primary desktop can't, so it gets
 *  a QR code to scan with the phone instead. `pointer: coarse` is the
 *  standard signal for "this input is a finger, not a mouse" — more
 *  reliable than a width breakpoint (a touch laptop is still mouse-primary;
 *  a narrow desktop window shouldn't switch to the QR flow). */
function useIsTouchPrimary() {
  const [isTouch, setIsTouch] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  )
  useEffect(() => {
    const mql = window.matchMedia('(pointer: coarse)')
    const handler = () => setIsTouch(mql.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])
  return isTouch
}

/** Desktop fallback for "Payer avec Wave": the payment link itself only
 *  does anything useful on a phone with the Wave app installed, so this
 *  renders it as a QR code (encoding the same link, amount included) to
 *  scan instead of opening a dead page in a new tab. The QR state lives in
 *  `WaveQrBody`, keyed by link — `Dialog` unmounts its children on close, so
 *  each opening starts from a clean state without a synchronous reset inside
 *  the generation effect. */
function WaveQrBody({ paymentLink, planLabel }: { paymentLink: string; planLabel: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(paymentLink, { width: 288, margin: 1, color: { dark: '#17152e', light: '#ffffff' } })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [paymentLink])

  return (
    <div className="flex h-64 w-full max-w-64 items-center justify-center rounded-xl border border-gray-200 bg-white p-3">
      {qrDataUrl ? (
        <img src={qrDataUrl} alt={`QR code de paiement Wave — ${planLabel}`} className="h-full w-full" />
      ) : (
        <Loader2 size={28} className="animate-spin text-gray-300" aria-hidden />
      )}
    </div>
  )
}

function WaveQrDialog({
  open,
  onClose,
  paymentLink,
  planLabel,
  amountLabel,
}: {
  open: boolean
  onClose: () => void
  paymentLink: string
  planLabel: string
  amountLabel: string
}) {
  return (
    <Dialog open={open} onClose={onClose} title={`Payer avec Wave — ${planLabel}`}>
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-sm text-gray-600">
          Ouvre l'app Wave sur ton téléphone et scanne ce code pour payer{' '}
          <strong className="text-gray-900">{amountLabel}</strong> et activer le plan {planLabel}.
        </p>
        <WaveQrBody key={paymentLink} paymentLink={paymentLink} planLabel={planLabel} />
        <p className="text-xs text-gray-400">
          Une fois le paiement effectué, reviens ici et envoie la capture de ton reçu Wave avec « Envoyer ma preuve de paiement ».
        </p>
      </div>
    </Dialog>
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

  const [proofPlan, setProofPlan] = useState<Exclude<PlanKey, 'free'> | null>(null)
  const [promoCode, setPromoCode] = useState('')
  const redeemCode = useRedeemPromo(shopId, undefined, () => setPromoCode(''))

  const isTouchPrimary = useIsTouchPrimary()
  const [qrDialogPlan, setQrDialogPlan] = useState<Exclude<PlanKey, 'free'> | null>(null)

  if (isLoading) return <PageLoader />

  const planKey = effectivePlanKey(subscription)
  const plan = effectivePlan(subscription)
  const manualPayments = payments
    .filter((p) => p.client_reference.startsWith('manual_'))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const pendingManualRequest = manualPayments.find((p) => p.status === 'pending')
  const latestManual = manualPayments[0]
  const refusedProof = !pendingManualRequest && latestManual?.status === 'failed' ? latestManual : null

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

      <PromoOfferCard shopId={shopId} />

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

      {refusedProof && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <XCircle size={16} className="mt-0.5 shrink-0" />
          <span>
            Votre dernière preuve de paiement a été refusée
            {refusedProof.rejection_reason ? ` : ${refusedProof.rejection_reason}` : ''}. Vous pouvez en renvoyer une.
          </span>
        </div>
      )}

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
                `${tier.maxActiveServices} prestations, ${tier.maxTeamMembers} équipiers, ${tier.maxMonthlyBookings} rendez-vous en ligne / mois`,
              ]
            : key === 'essential'
              ? [
                  'Jusqu’à 50 produits actifs',
                  `Builder complet (${tier.maxCustomSections} blocs de contenu) et pages personnalisées`,
                  'Analytics standard et import CSV',
                  `${tier.maxActiveServices} prestations, ${tier.maxTeamMembers} équipiers, ${tier.maxMonthlyBookings} rendez-vous en ligne / mois`,
                ]
              : [
                  'Produits illimités',
                  'Personnalisation illimitée (blocs et pages) et styles avancés',
                  'Analytics avancées et branding retiré',
                  'Prestations, équipiers et rendez-vous en ligne illimités',
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
              ) : key === 'essential' && planKey === 'pro' ? (
                <p className="mt-5 rounded-lg bg-gray-50 px-3 py-2 text-center text-xs font-medium text-gray-500">Inclus dans votre plan Pro</p>
              ) : pendingManualRequest ? (
                <div className="mt-5 space-y-1 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-700">
                  <div className="flex items-center justify-center gap-2"><Clock size={14} /> Preuve envoyée — vérification en cours (sous 24 h)</div>
                  <button type="button" onClick={() => setProofPlan(key)} className="py-1 text-xs font-medium text-amber-800 underline">Remplacer la preuve</button>
                </div>
              ) : (
                <div className="mt-5 space-y-2">
                  {isTouchPrimary ? (
                    <a href={paymentLink} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
                      <CreditCard size={15} /> Payer avec Wave
                    </a>
                  ) : (
                    <button type="button" onClick={() => setQrDialogPlan(key)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
                      <CreditCard size={15} /> Payer avec Wave
                    </button>
                  )}
                  <button type="button" onClick={() => setProofPlan(key)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <CheckCircle2 size={14} />
                    Envoyer ma preuve de paiement
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <WaveQrDialog
        open={qrDialogPlan !== null}
        onClose={() => setQrDialogPlan(null)}
        paymentLink={qrDialogPlan === 'essential' ? WAVE_ESSENTIAL_PAYMENT_LINK : WAVE_PRO_PAYMENT_LINK}
        planLabel={qrDialogPlan ? PLANS[qrDialogPlan].label : ''}
        amountLabel={qrDialogPlan ? formatCurrency(PLANS[qrDialogPlan].priceXof, 'XOF') : ''}
      />

      <PaymentProofDialog
        open={proofPlan !== null}
        onClose={() => setProofPlan(null)}
        shopId={shopId}
        plan={proofPlan ?? 'essential'}
      />

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm font-medium text-gray-700">J'ai un code promo</p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (promoCode.trim()) redeemCode.mutate(promoCode)
          }}
          className="mt-2 flex gap-2"
        >
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Code promo"
            aria-label="Code promo"
            className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm uppercase focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="submit"
            disabled={!promoCode.trim() || redeemCode.isPending}
            className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {redeemCode.isPending && <Loader2 size={14} className="animate-spin" aria-hidden />}
            Appliquer
          </button>
        </form>
      </div>

      {payments.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <ul className="divide-y divide-gray-100 md:hidden">
            {payments.map((payment) => (
              <li key={payment.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {new Date(payment.created_at).toLocaleDateString('fr-FR')} · <span className="capitalize">{payment.plan}</span>
                  </p>
                  <p className="mt-0.5 text-sm text-gray-500">{formatCurrency(Number(payment.amount), payment.currency)}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    payment.status === 'succeeded'
                      ? 'bg-emerald-100 text-emerald-800'
                      : payment.status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {payment.status === 'succeeded' ? 'Payé' : payment.status === 'failed' ? 'Échoué' : 'En attente'}
                </span>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto md:block">
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
        </div>
      )}
    </div>
  )
}
