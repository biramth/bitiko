import { useQuery } from '@tanstack/react-query'
import { MessageCircle, Settings2, ShieldCheck, Truck } from 'lucide-react'
import { listDeliverySecteurs, listDeliveryVilles } from '@/services/deliverySecteur.service'
import { describeDelivery, summarizeDelivery } from '@/utils/deliverySummary'
import { formatCurrency } from '@/utils/format'
import { useIsEmbeddedPreview } from '../useEmbeddedPreview'
import type { Shop } from '@/types'

/** Livraison & paiement de CETTE boutique (zones, seuil de gratuité, WhatsApp) —
 *  pas des promesses génériques : fiche produit et panier rassurent avec ce que
 *  le vendeur propose vraiment. Sans zones configurées, une ligne de repli
 *  rassure quand même au lieu de laisser un vide anxiogène. */
export function DeliveryPaymentInfo({ shop, className = '' }: { shop: Shop; className?: string }) {
  const { data: secteurs, isLoading: secteursLoading } = useQuery({
    queryKey: ['delivery-secteurs', shop.id],
    queryFn: () => listDeliverySecteurs(shop.id),
  })
  const { data: villes, isLoading: villesLoading } = useQuery({
    queryKey: ['delivery-villes', shop.id],
    queryFn: () => listDeliveryVilles(shop.id),
  })
  const isEmbeddedPreview = useIsEmbeddedPreview()
  if (secteursLoading || villesLoading) return null
  if (!secteurs || !villes) return null

  const currency = shop.currency ?? 'XOF'
  const summary = summarizeDelivery(secteurs, villes, shop.free_delivery_threshold)
  const delivery =
    summary.kind === 'arranged'
      ? shop.whatsapp_number
        ? 'Livraison ou retrait — tarifs confirmés avec le vendeur sur WhatsApp'
        : 'Livraison ou retrait — contactez la boutique pour les tarifs'
      : describeDelivery(summary, (amount) => formatCurrency(amount, currency))
  const rows = [
    { icon: Truck, text: delivery },
    { icon: ShieldCheck, text: 'Paiement à la livraison ou par Mobile Money — aucune carte bancaire' },
    ...(shop.whatsapp_number ? [{ icon: MessageCircle, text: 'Commande confirmée par le vendeur sur WhatsApp' }] : []),
  ]

  return (
    <ul
      aria-label="Livraison et paiement"
      className={`flex flex-col gap-2 border-t border-[var(--shop-text)]/10 pt-5 text-xs text-[var(--shop-text)]/70 ${className}`}
    >
      {rows.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-start gap-2">
          <Icon size={15} className="mt-px shrink-0 text-[var(--shop-text)]/50" aria-hidden />
          {text}
        </li>
      ))}
      {isEmbeddedPreview && summary.kind === 'arranged' && (
        <li className="flex items-start gap-2 rounded-lg border border-dashed border-[var(--shop-accent)]/50 px-3 py-2 text-[var(--shop-text)]">
          <Settings2 size={15} className="mt-px shrink-0 text-[var(--shop-accent)]" aria-hidden />
          Tarifs non configurés — Paramètres → Livraison &amp; stock (visible par toi seul).
        </li>
      )}
    </ul>
  )
}
