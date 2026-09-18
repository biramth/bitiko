import { useQuery } from '@tanstack/react-query'
import { Gift, Loader2 } from 'lucide-react'
import { getPromoOffer } from '@/services/billing.service'
import { PLANS } from '@/config/plans'
import { useRedeemPromo } from './useRedeemPromo'

export function PromoOfferCard({ shopId }: { shopId: string }) {
  const { data: offer } = useQuery({
    queryKey: ['promo-offer', shopId],
    queryFn: () => getPromoOffer(shopId),
  })
  const redeem = useRedeemPromo(shopId, offer?.plan)

  if (!offer) return null

  const until = offer.expires_at
    ? new Date(offer.expires_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="mt-6 rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Gift size={20} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="font-heading text-base font-semibold text-gray-900">{offer.label}</h2>
          <p className="mt-1 text-sm text-gray-700">
            Activez gratuitement {offer.days} jours de {PLANS[offer.plan].label}, sans paiement ni engagement.
            {until ? ` Offre valable jusqu'au ${until}.` : ''}
          </p>
          {offer.description && <p className="mt-1 text-xs text-gray-500">{offer.description}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={() => redeem.mutate(undefined)}
        disabled={redeem.isPending}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 sm:w-auto sm:px-5"
      >
        {redeem.isPending && <Loader2 size={15} className="animate-spin" aria-hidden />}
        Activer mon mois offert
      </button>
    </div>
  )
}
