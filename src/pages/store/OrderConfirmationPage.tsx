import { CheckCircle2, MessageCircle } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useTenant } from '@/features/tenant/TenantContext'
import { usePageSeo } from '@/hooks/usePageSeo'
import { formatCurrency } from '@/utils/format'
import type { CreateOrderResult } from '@/services/order.service'
import type { PaymentMethod } from '@/types'

export interface OrderConfirmationState {
  orderNumber: string
  total: number
  items: CreateOrderResult['items']
  deliveryFee: number
  currency: string
  paymentMethod: PaymentMethod
  paymentInstructions: string | null
  whatsappUrl: string
  autoOpenFailed: boolean
  customerName: string
}

export function OrderConfirmationPage() {
  const { shop } = useTenant()
  const { id } = useParams()
  const { state } = useLocation()
  const confirmation = state as OrderConfirmationState | null
  const orderNumber = confirmation?.orderNumber ?? id

  usePageSeo({ title: orderNumber ? `Commande ${orderNumber}` : 'Commande confirmée', noindex: true })

  if (!shop) return null

  return (
    <div className="mx-auto max-w-lg px-4 py-10 text-center sm:px-6">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
        <CheckCircle2 size={32} className="text-emerald-600" aria-hidden />
      </span>
      <h1 className="mt-4 font-heading text-2xl font-bold text-ink-900">Commande créée !</h1>
      <p className="mt-2 text-sm text-ink-700/70">
        Commande <span className="font-semibold text-ink-900">{orderNumber}</span> enregistrée.
        {confirmation && !confirmation.autoOpenFailed && " WhatsApp s'ouvre dans un nouvel onglet…"}
      </p>

      {confirmation && (
        <>
          <div className="mt-8 border-t border-ink-900/10 pt-6 text-left">
            <ul className="space-y-1.5 text-sm text-ink-700/80">
              {confirmation.items.map((item, index) => (
                <li key={`${item.productName}-${index}`} className="flex justify-between gap-4">
                  <span>
                    {item.variantName ? `${item.productName} (${item.variantName})` : item.productName} × {item.quantity}
                  </span>
                  <span className="shrink-0">{formatCurrency(item.subtotal, confirmation.currency)}</span>
                </li>
              ))}
            </ul>
            {confirmation.deliveryFee > 0 && (
              <div className="mt-2 flex justify-between text-sm text-ink-700/80">
                <span>Livraison</span>
                <span>{formatCurrency(confirmation.deliveryFee, confirmation.currency)}</span>
              </div>
            )}
            <div className="mt-3 flex justify-between border-t border-ink-900/10 pt-3 font-semibold text-ink-900">
              <span>Total ({confirmation.currency})</span>
              <span>{formatCurrency(confirmation.total, confirmation.currency)}</span>
            </div>
          </div>

          {confirmation.paymentMethod === 'mobile_money' && confirmation.paymentInstructions?.trim() && (
            <div className="mt-4 rounded-lg bg-sand-100 p-4 text-left text-sm text-ink-700">
              <p className="font-semibold text-ink-900">Modalités de paiement :</p>
              <p className="mt-1 whitespace-pre-line">{confirmation.paymentInstructions}</p>
            </div>
          )}

          {confirmation.autoOpenFailed && (
            <a href={confirmation.whatsappUrl} target="_blank" rel="noreferrer" className="mt-8 flex items-center justify-center gap-2 bg-emerald-600 py-4 text-sm font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90">
              <MessageCircle size={18} aria-hidden /> Retour à WhatsApp
            </a>
          )}
        </>
      )}

      <Link to="/" className="mt-6 inline-block text-sm font-medium text-ink-700/60 hover:text-ink-900">
        Retour à la boutique
      </Link>
    </div>
  )
}