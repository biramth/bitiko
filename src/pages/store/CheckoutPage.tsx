import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useCart } from '@/features/cart/CartContext'
import { useTenant } from '@/features/tenant/TenantContext'
import { createOrder, buildWhatsAppMessage, buildWhatsAppUrl } from '@/services/order.service'
import { formatCurrency } from '@/utils/format'
import { ErrorMessage } from '@/components/ui/ErrorMessage'

export function CheckoutPage() {
  const { items, subtotal, clear } = useCart()
  const { shop } = useTenant()
  const navigate = useNavigate()
  const currency = shop?.currency ?? 'XOF'

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  const mutation = useMutation({
    mutationFn: async () => {
      if (!shop) throw new Error('Boutique introuvable')
      const result = await createOrder({
        shopId: shop.id,
        customerName,
        customerPhone,
        items,
      })
      return result
    },
    onSuccess: (result) => {
      const message = buildWhatsAppMessage({
        orderNumber: result.orderNumber,
        items: result.items,
        total: result.total,
        customerName,
        customerPhone,
        formatCurrency: (amount) => formatCurrency(amount, currency),
      })
      clear()
      const url = buildWhatsAppUrl(shop!.whatsapp_number, message)
      window.location.href = url
      navigate('/', { replace: true })
    },
  })

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
          <span>Total</span>
          <span>{formatCurrency(subtotal, currency)}</span>
        </div>
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
