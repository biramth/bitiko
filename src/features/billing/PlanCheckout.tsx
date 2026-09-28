import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { CheckCircle2, Clock, CreditCard, Loader2, XCircle } from 'lucide-react'
import { listPayments } from '@/services/billing.service'
import { PaymentProofDialog } from '@/features/billing/PaymentProofDialog'
import { PLANS, WAVE_ESSENTIAL_PAYMENT_LINK, WAVE_PRO_PAYMENT_LINK } from '@/config/plans'
import type { PaidPlanKey } from '@/config/upgradeMoments'
import { formatCurrency } from '@/utils/format'
import { Dialog } from '@/components/ui/Dialog'
import { buttonClass } from '@/components/ui/styles'

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

/** Desktop fallback: the payment link only does something useful on a phone
 *  with the Wave app, so it is rendered as a QR code (same link, amount
 *  included). `Dialog` unmounts its children on close, so each opening starts
 *  from a clean state. */
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
    <Dialog open={open} onClose={onClose} title={`Activer ${planLabel} avec Wave`}>
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-sm text-gray-600">
          Ouvrez l'app Wave sur votre téléphone et scannez ce code : {amountLabel} et {planLabel} est activé.
        </p>
        <WaveQrBody key={paymentLink} paymentLink={paymentLink} planLabel={planLabel} />
        <p className="text-xs text-gray-400">
          Une fois le paiement effectué, revenez ici et envoyez la capture de votre reçu avec « J'ai déjà payé ».
        </p>
      </div>
    </Dialog>
  )
}

function paymentLinkFor(plan: PaidPlanKey): string {
  return plan === 'essential' ? WAVE_ESSENTIAL_PAYMENT_LINK : WAVE_PRO_PAYMENT_LINK
}

/** Étape finale d'une activation de plan : régler avec Wave puis envoyer la
 *  preuve, ou suivre la vérification d'une preuve déjà envoyée. Partagée entre
 *  la fenêtre « Changer d'abonnement » et les moments d'activation contextuels. */
export function PlanCheckout({
  shopId,
  plan,
  showRefusal = false,
}: {
  shopId: string
  plan: PaidPlanKey
  showRefusal?: boolean
}) {
  const [proofOpen, setProofOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const isTouchPrimary = useIsTouchPrimary()

  const { data: payments = [] } = useQuery({
    queryKey: ['wave-payments', shopId],
    queryFn: () => listPayments(shopId),
  })
  const manualPayments = payments
    .filter((p) => p.client_reference.startsWith('manual_'))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const pendingRequest = manualPayments.find((p) => p.status === 'pending')
  const latest = manualPayments[0]
  const refused = !pendingRequest && latest?.status === 'failed' ? latest : null

  const link = paymentLinkFor(plan)
  const tier = PLANS[plan]

  return (
    <>
      {showRefusal && refused && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <XCircle size={14} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            Votre dernière preuve n'a pas pu être validée
            {refused.rejection_reason ? ` : ${refused.rejection_reason}` : ''}. Vous pouvez en renvoyer une.
          </span>
        </div>
      )}

      {pendingRequest ? (
        <div className="space-y-1 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-700">
          <div className="flex items-center justify-center gap-2">
            <Clock size={14} aria-hidden /> Preuve envoyée — vérification en cours (sous 24 h)
          </div>
          <button type="button" onClick={() => setProofOpen(true)} className="py-1 text-xs font-medium text-amber-800 underline">
            Remplacer la preuve
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {isTouchPrimary ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass({ fullWidth: true })}
            >
              <CreditCard size={15} aria-hidden /> Activer avec Wave
            </a>
          ) : (
            <button type="button" onClick={() => setQrOpen(true)} className={buttonClass({ fullWidth: true })}>
              <CreditCard size={15} aria-hidden /> Activer avec Wave
            </button>
          )}
          <button
            type="button"
            onClick={() => setProofOpen(true)}
            className={buttonClass({ variant: 'secondary', fullWidth: true })}
          >
            <CheckCircle2 size={14} aria-hidden />
            J'ai déjà payé
          </button>
        </div>
      )}

      <WaveQrDialog
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        paymentLink={link}
        planLabel={tier.label}
        amountLabel={formatCurrency(tier.priceXof, 'XOF')}
      />
      <PaymentProofDialog open={proofOpen} onClose={() => setProofOpen(false)} shopId={shopId} plan={plan} />
    </>
  )
}
