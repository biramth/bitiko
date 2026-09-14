import { Link } from 'react-router-dom'
import { ImageOff, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { useCart } from '@/features/cart/CartContext'
import { useTenant } from '@/features/tenant/TenantContext'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/utils/format'

export function CartPage() {
  const { items, subtotal, updateQuantity, removeItem } = useCart()
  const { shop } = useTenant()
  const currency = shop?.currency ?? 'XOF'

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <EmptyState
          icon={ShoppingBag}
          title="Votre panier est vide"
          description="Parcourez le catalogue pour ajouter des produits."
        />
        <div className="text-center">
          <Link to="/catalogue" className="text-sm font-medium text-brand-700">
            Voir le catalogue
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold text-gray-900">Mon panier</h1>

      <ul className="mt-6 divide-y divide-gray-100">
        {items.map((item) => (
          <li key={item.productId} className="flex gap-4 py-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-300">
                  <ImageOff size={24} aria-hidden />
                </div>
              )}
            </div>

            <div className="flex flex-1 flex-col justify-between">
              <div className="flex items-start justify-between gap-2">
                <Link to={`/produits/${item.slug}`} className="text-sm font-medium text-gray-900">
                  {item.name}
                </Link>
                <button
                  onClick={() => removeItem(item.productId)}
                  aria-label={`Supprimer ${item.name} du panier`}
                  className="text-gray-400 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <p className="text-sm text-gray-500">{formatCurrency(item.price, currency)} / unité</p>

              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center rounded-lg border border-gray-200">
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    aria-label="Diminuer la quantité"
                    className="p-1.5 text-gray-600 hover:bg-gray-50"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    disabled={item.quantity >= item.stock}
                    aria-label="Augmenter la quantité"
                    className="p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <p className="font-semibold text-gray-900">
                  {formatCurrency(item.price * item.quantity, currency)}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
        <span className="text-lg font-semibold text-gray-900">Total</span>
        <span className="text-lg font-semibold text-gray-900">{formatCurrency(subtotal, currency)}</span>
      </div>

      <Link
        to="/commande"
        className="mt-6 block w-full rounded-lg bg-gray-900 py-3 text-center text-sm font-medium text-white hover:bg-gray-800"
      >
        Passer la commande
      </Link>
    </div>
  )
}
