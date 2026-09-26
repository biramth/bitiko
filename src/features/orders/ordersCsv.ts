import { CSV_BOM, csvLine, frenchDate } from '@/features/finance/exportCsv'
import { ORDER_STATUS_LABELS } from '@/config/constants'
import type { Order } from '@/types'

export interface ExportOrder extends Order {
  items: { product_name: string; variant_name: string | null; quantity: number }[]
}

const PAYMENT_LABELS: Record<string, string> = { cod: 'Espèces à la livraison', mobile_money: 'Mobile money' }

/** Une ligne par commande, lisible dans Excel : articles résumés, montants bruts (sans devise) pour pouvoir les additionner. */
export function buildOrdersCsv(orders: ExportOrder[], currency: string): string {
  const rows = [
    csvLine(['Commande', 'Date', 'Statut', 'Client', 'Téléphone', 'Adresse', 'Zone', 'Articles', 'Sous-total', 'Livraison', `Total (${currency})`, 'Paiement', 'Note']),
    ...[...orders]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((order) => {
        const fee = Number(order.delivery_fee ?? 0)
        const articles = order.items
          .map((item) => `${item.quantity} × ${item.product_name}${item.variant_name && !item.product_name.includes(item.variant_name) ? ` (${item.variant_name})` : ''}`)
          .join(' ; ')
        return csvLine([
          order.order_number,
          frenchDate(order.created_at),
          ORDER_STATUS_LABELS[order.status] ?? order.status,
          order.customer_name,
          order.customer_phone,
          order.customer_address,
          order.delivery_zone_name,
          articles,
          Number(order.total) - fee,
          fee,
          Number(order.total),
          PAYMENT_LABELS[order.payment_method] ?? order.payment_method,
          order.notes,
        ])
      }),
  ]
  return CSV_BOM + rows.join('\r\n') + '\r\n'
}
