import type { PaymentMethod } from '@/types'

export interface WhatsAppOrderItem {
  productName: string
  variantName?: string | null
  /** What the customer filled in (Ton : Rose…), shown under the product. */
  options?: { label: string; value: string }[] | null
  unitPrice: number
  quantity: number
  subtotal: number
}

/** The order message the customer sends to the shop on WhatsApp. It starts
 *  straight with the order — no "Bonjour": orders come in at any hour, and a
 *  greeting reads oddly at night. */
export function buildWhatsAppMessage(params: {
  orderNumber: string
  items: WhatsAppOrderItem[]
  deliveryFee?: number
  deliveryZoneName?: string
  paymentMethod?: PaymentMethod
  paymentInstructions?: string | null
  total: number
  customerName: string
  customerPhone: string
  customerAddress: string
  formatCurrency: (amount: number) => string
}): string {
  const lines = [`Commande #${params.orderNumber}`, '', 'Produits :']
  for (const i of params.items) {
    const label = i.variantName ? `${i.productName} (${i.variantName})` : i.productName
    lines.push(`- ${label} x${i.quantity} — ${params.formatCurrency(i.subtotal)}`)
    for (const o of i.options ?? []) lines.push(`   • ${o.label} : ${o.value}`)
  }
  if (params.deliveryZoneName) {
    lines.push('', `Zone de livraison : ${params.deliveryZoneName}`)
  }
  if (params.deliveryFee && params.deliveryFee > 0) {
    lines.push(`Livraison : ${params.formatCurrency(params.deliveryFee)}`)
  }
  lines.push('', `Total : ${params.formatCurrency(params.total)}`)
  lines.push(
    params.paymentMethod === 'mobile_money'
      ? 'Paiement : Mobile money (Wave / Orange Money) avant envoi.'
      : 'Paiement : Espèces à la livraison.',
  )
  if (params.paymentMethod === 'mobile_money' && params.paymentInstructions?.trim()) {
    lines.push(params.paymentInstructions.trim())
  }
  lines.push(
    '',
    `Nom : ${params.customerName}`,
    `Téléphone : ${params.customerPhone}`,
    `Adresse : ${params.customerAddress}`,
  )
  return lines.join('\n')
}

export function buildWhatsAppUrl(whatsappNumber: string, message: string): string {
  const digitsOnly = whatsappNumber.replace(/[^0-9]/g, '')
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`
}

/** The booking message the customer sends to the shop on WhatsApp, right after
 *  a rendez-vous/réservation request — same pattern as the order message: no
 *  "Bonjour", straight to the point since it stands in for a phone call. */
export function buildBookingWhatsAppMessage(params: {
  kind: 'appointment' | 'reservation'
  detail: string
  whenLabel: string
  customerName: string
  customerPhone: string
}): string {
  const lines = [
    params.kind === 'appointment' ? 'Nouvelle demande de rendez-vous' : 'Nouvelle demande de réservation',
    '',
    params.detail,
    params.whenLabel,
    '',
    `Nom : ${params.customerName}`,
    `Téléphone : ${params.customerPhone}`,
  ]
  return lines.join('\n')
}
