import { formatCurrency } from './format'

export interface OrderMessageInput {
  order_number: string
  customer_name: string
  status: string
  total: number | string
  payment_method: string
}

/** Message WhatsApp adapté à l'étape de la commande : le commerçant n'a plus qu'à envoyer. */
export function orderStatusMessage(order: OrderMessageInput, shopName: string, currency: string): string {
  const first = order.customer_name.trim().split(/\s+/)[0] || 'Bonjour'
  const greeting = `Bonjour ${first},`
  const total = formatCurrency(Number(order.total), currency)
  const ref = `commande ${order.order_number}`
  const signature = `— ${shopName}`

  switch (order.status) {
    case 'confirmed':
      return order.payment_method === 'mobile_money'
        ? `${greeting} votre ${ref} (${total}) est confirmée. Pour la préparer, merci de régler par mobile money puis de nous envoyer la preuve de paiement. ${signature}`
        : `${greeting} votre ${ref} (${total}) est confirmée. Nous la préparons et vous contactons pour la livraison. Paiement en espèces à la livraison. ${signature}`
    case 'paid':
      return `${greeting} nous avons bien reçu le paiement de votre ${ref} (${total}). Merci ! Nous préparons l’envoi. ${signature}`
    case 'delivered':
      return `${greeting} votre ${ref} a été livrée. Merci pour votre confiance, n’hésitez pas à nous dire si tout est conforme ! ${signature}`
    case 'cancelled':
      return `${greeting} votre ${ref} a été annulée. Contactez-nous si vous souhaitez la repasser ou si vous avez une question. ${signature}`
    default:
      return `${greeting} nous avons bien reçu votre ${ref} (${total}). Nous la confirmons très vite. ${signature}`
  }
}
