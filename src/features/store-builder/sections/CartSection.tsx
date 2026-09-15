import { Link } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { useCart } from '@/features/cart/CartContext'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/utils/format'
import { useIsEmbeddedPreview } from '../useEmbeddedPreview'
import { buildDemoCart } from '../demoCart'
import type { Shop } from '@/types'
import type { CartSectionConfig } from '@/types/builder'
import { editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'
import { ImageOff, Minus, Plus, Trash2, ArrowRight } from 'lucide-react'

export function CartRenderer({ shop, config }: { shop: Shop; config: CartSectionConfig }) {
  const { items: realItems, subtotal: realSubtotal, updateQuantity, removeItem } = useCart()
  const isEmbeddedPreview = useIsEmbeddedPreview()
  const demo = isEmbeddedPreview && realItems.length === 0 ? buildDemoCart(shop) : null
  const items = demo ?? realItems
  const subtotal = demo ? demo.reduce((sum, i) => sum + i.price * i.quantity, 0) : realSubtotal
  const currency = shop.currency ?? 'XOF'
  const isDemo = demo !== null

  if (!isDemo && items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <EmptyState
          icon={ShoppingBag}
          title="Votre panier est vide"
          description="Parcourez le catalogue pour ajouter des produits."
        />
        <div className="text-center">
          <Link to="/catalogue" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-900 underline underline-offset-2">
            Voir le catalogue
            <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {config.heading && (
        <h1 className="font-heading text-2xl font-bold text-[var(--shop-text)] sm:text-3xl">{config.heading}</h1>
      )}

      <ul className="mt-8 divide-y divide-ink-900/10 border-t border-ink-900/10">
        {items.map((item) => (
          <li key={item.productId} className="flex gap-5 py-5">
            <div className="h-24 w-24 shrink-0 overflow-hidden bg-sand-100">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-ink-200">
                  <ImageOff size={24} aria-hidden />
                </div>
              )}
            </div>

            <div className="flex flex-1 flex-col justify-between">
              <div className="flex items-start justify-between gap-2">
                <Link to={`/produits/${item.slug}`} className="text-sm font-medium text-[var(--shop-text)] hover:underline">
                  {item.name}
                </Link>
                {!isDemo && (
                  <button
                    onClick={() => removeItem(item.productId)}
                    aria-label={`Supprimer ${item.name} du panier`}
                    className="text-ink-700/30 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <p className="text-sm text-ink-700/50">{formatCurrency(item.price, currency)} / unité</p>

              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {!isDemo ? (
                    <>
                      <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} aria-label="Diminuer la quantité" className="text-ink-700 hover:text-ink-900"><Minus size={14} /></button>
                      <span className="w-4 text-center text-sm font-medium text-ink-900">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} disabled={item.quantity >= item.stock} aria-label="Augmenter la quantité" className="text-ink-700 hover:text-ink-900 disabled:opacity-30"><Plus size={14} /></button>
                    </>
                  ) : (
                    <span className="text-sm text-ink-700/60">Qté : {item.quantity}</span>
                  )}
                </div>
                <p className="font-semibold text-ink-900">
                  {formatCurrency(item.price * item.quantity, currency)}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between border-t border-ink-900/10 pt-4">
        <span className="text-base font-semibold text-[var(--shop-text)]">Total</span>
        <span className="text-lg font-bold text-[var(--shop-text)]">{formatCurrency(subtotal, currency)}</span>
      </div>

      {!isDemo && (
        <Link
          to="/commande"
          className="mt-6 flex w-full items-center justify-center gap-2 bg-[var(--shop-button)] py-4 text-center text-sm font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90"
        >
          Passer la commande
          <ArrowRight size={16} aria-hidden />
        </Link>
      )}
      {isDemo && (
        <Link
          to="/commande"
          className="mt-6 flex w-full items-center justify-center gap-2 bg-[var(--shop-button)] py-4 text-center text-sm font-semibold uppercase tracking-widest text-white opacity-50 pointer-events-none"
        >
          Passer la commande
          <ArrowRight size={16} aria-hidden />
        </Link>
      )}
    </div>
  )
}

export function CartEditor({ config, onChange }: SectionEditorProps<CartSectionConfig>) {
  return (
    <div>
      <label className={editorLabelClass}>Titre</label>
      <input
        value={config.heading}
        onChange={(e) => onChange({ ...config, heading: e.target.value })}
        className={editorInputClass}
      />
    </div>
  )
}
