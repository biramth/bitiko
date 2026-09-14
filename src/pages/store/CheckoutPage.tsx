import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, MessageCircle } from 'lucide-react'
import { useCart } from '@/features/cart/CartContext'
import { useTenant } from '@/features/tenant/TenantContext'
import {
  createOrder,
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  type CreateOrderResult,
} from '@/services/order.service'
import { formatCurrency } from '@/utils/format'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { usePageSeo } from '@/hooks/usePageSeo'

export function CheckoutPage() {
  const { items, subtotal, clear } = useCart()
  const { shop } = useTenant()
  const currency = shop?.currency ?? 'XOF'
  usePageSeo({ title: shop ? `Commande — ${shop.name}` : 'Commande', noindex: true })

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [orderResult, setOrderResult] = useState<CreateOrderResult | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      if (!shop) throw new Error('Boutique introuvable')
      return createOrder({
        shopId: shop.id,
        customerName,
        customerPhone,
        items,
      })
    },
    onSuccess: (result) => {
      setOrderResult(result)
      clear()
    },
  })

  if (!shop) return null

  if (orderResult) {
    const message = buildWhatsAppMessage({
      orderNumber: orderResult.orderNumber,
      items: orderResult.items,
      total: orderResult.total,
      customerName,
      customerPhone,
      formatCurrency: (amount) => formatCurrency(amount, currency),
    })
    const whatsappUrl = buildWhatsAppUrl(shop.whatsapp_number, message)

    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-center sm:px-6">
        <CheckCircle2 size={48} className="mx-auto text-emerald-500" aria-hidden />
        <h1 className="mt-4 text-2xl font-semibold text-gray-900">Commande créée !</h1>
        <p className="mt-2 text-sm text-gray-600">
          Commande{' '}
          <span className="font-semibold text-gray-900">{orderResult.orderNumber}</span>{' '}
          enregistrée. Ouvrez WhatsApp pour l'envoyer au vendeur.
        </p>

        <div className="mt-6 rounded-lg border border-gray-200 p-4 text-left">
          <ul className="space-y-1 text-sm text-gray-600">
            {orderResult.items.map((item, index) => (
              <li key={index} className="flex justify-between gap-4">
                <span>
                  {item.productName} × {item.quantity}
                </span>
                <span>{formatCurrency(item.subtotal, currency)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-gray-100 pt-3 text-sm font-semibold text-gray-900">
            <span>Total ({currency})</span>
            <span>{formatCurrency(orderResult.total, currency)}</span>
          </div>
        </div>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <MessageCircle size={18} aria-hidden /> Envoyer sur WhatsApp
        </a>
        <Link to="/" className="mt-3 inline-block text-sm font-medium text-gray-600 hover:text-gray-900">
          Retour à la boutique
        </Link>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-gray-600">
        Votre panier est vide.
      </div>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold text-gray-900">Finaliser la commande</h1>

      <div className="mt-6 rounded-lg border border-gray-200 p-4">
        <ul className="space-y-1 text-sm text-gray-600">
          {items.map((item) => (
            <li key={item.productId} className="flex justify-between">
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>{formatCurrency(item.price * item.quantity, currency)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-gray-100 pt-3 font-semibold text-gray-900">
          <span>Total estimé</span>
          <span>{formatCurrency(subtotal, currency)}</span>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Le total définitif est recalculé au moment de la commande (prix et stock à jour).
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="customerName" className="block text-sm font-medium text-gray-700">
            Nom complet
          </label>
          <input
            id="customerName"
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700">
            Numéro de téléphone
          </label>
          <input
            id="customerPhone"
            type="tel"
            required
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="+221 XX XXX XX XX"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
          />
        </div>

        {mutation.isError && (
          <ErrorMessage message="Impossible de créer la commande. Vérifiez votre panier et réessayez." />
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded-lg bg-brand-600 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {mutation.isPending ? 'Création de la commande…' : 'Commander via WhatsApp'}
        </button>
      </form>
    </div>
  )
}