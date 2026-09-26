import { useQuery } from '@tanstack/react-query'
import { MessageCircle, ShieldCheck, Truck } from 'lucide-react'
import { listDeliverySecteurs, listDeliveryVilles } from '@/services/deliverySecteur.service'
import { describeDelivery, summarizeDelivery } from '@/utils/deliverySummary'
import { formatCurrency } from '@/utils/format'
import type { Shop } from '@/types'

/** Livraison & paiement de CETTE boutique (zones, seuil de gratuité, WhatsApp) —
 *  pas des promesses génériques : fiche produit et panier rassurent avec ce que
 *  le vendeur propose vraiment. */
export function DeliveryPaymentInfo({ shop, className = '' }: { shop: Shop; className?: string }) {
  const { data: secteurs } = useQuery({
    queryKey: ['delivery-secteurs', shop.id],
    queryFn: () => listDeliverySecteurs(shop.id),
  })
  const { data: villes } = useQuery({
    queryKey: ['delivery-villes', shop.id],
    queryFn: () => listDeliveryVilles(shop.id),
  })
  // Tant que les zones ne sont pas là, ne rien afficher plutôt que « à convenir ».
  if (!secteurs || !villes) return null

  const currency = shop.currency ?? 'XOF'
  const delivery = describeDelivery(summarizeDelivery(secteurs, villes, shop.free_delivery_threshold), (amount) =>
    formatCurrency(amount, currency),
  )
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
    </ul>
  )
}
