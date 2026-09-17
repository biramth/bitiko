import { Link } from 'react-router-dom'
import { PartyPopper, Share2, ShoppingBag, Truck } from 'lucide-react'
import { useCart } from '@/features/cart/CartContext'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/utils/format'
import { useIsEmbeddedPreview } from '../useEmbeddedPreview'
import { buildDemoCart } from '../demoCart'
import type { Shop } from '@/types'
import type { CartSectionConfig, ThemeConfig } from '@/types/builder'
import { SECTION_HEADING_SCALE } from '@/config/themeTokens'
import { editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'
import { useToast } from '@/components/ui/Toast'
import { trackEvent } from '@/lib/analytics'
import { ImageOff, Minus, Plus, Trash2, ArrowRight } from 'lucide-react'

/** Progress toward the shop's free-delivery threshold — hidden when the shop
 *  hasn't configured one, or once it's already reached (delivery fee is
 *  already computed as 0 at that point, so this becomes a celebration). */
function FreeDeliveryProgress({ shop, subtotal }: { shop: Shop; subtotal: number }) {
  const threshold = shop.free_delivery_threshold != null ? Number(shop.free_delivery_threshold) : null
  if (threshold == null || threshold <= 0) return null
  const currency = shop.currency ?? 'XOF'
  const unlocked = subtotal >= threshold
  const percent = Math.min(100, Math.round((subtotal / threshold) * 100))

  return (
    <div className="mb-6 bg-[var(--shop-text)]/5 p-4" style={{ borderRadius: 'var(--shop-radius)' }}>
      <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--shop-text)]">
        {unlocked ? (
          <><PartyPopper size={15} className="shrink-0 text-emerald-600" aria-hidden /> Livraison gratuite débloquée !</>
        ) : (
          <><Truck size={15} className="shrink-0 text-[var(--shop-text)]/60" aria-hidden /> Plus que {formatCurrency(threshold - subtotal, currency)} pour la livraison gratuite</>
        )}
      </p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--shop-text)]/10">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${unlocked ? 'bg-emerald-600' : 'bg-[var(--shop-accent)]'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

export function CartRenderer({ shop, config, themeConfig }: { shop: Shop; config: CartSectionConfig; themeConfig: ThemeConfig }) {
  const { items: realItems, subtotal: realSubtotal, updateQuantity, removeItem } = useCart()
  const toast = useToast()
  const isEmbeddedPreview = useIsEmbeddedPreview()
  const demo = isEmbeddedPreview && realItems.length === 0 ? buildDemoCart(shop) : null
  const items = demo ?? realItems
  const subtotal = demo ? demo.reduce((sum, i) => sum + i.price * i.quantity, 0) : realSubtotal
  const currency = shop.currency ?? 'XOF'
  const isDemo = demo !== null

  const handleShareCart = async () => {
    const lines = items.map((item) => `- ${item.name} x${item.quantity} : ${formatCurrency(item.price * item.quantity, currency)}`)
    const text = `Mon panier chez ${shop.name}\n${lines.join('\n')}\nTotal : ${formatCurrency(subtotal, currency)}\n\nJe souhaite confirmer cette sélection avec vous.`
    try {
      if (navigator.share) {
        await navigator.share({ title: `Panier — ${shop.name}`, text })
        trackEvent('share', { content_type: 'cart', item_count: items.length, value: subtotal, currency })
      } else {
        await navigator.clipboard.writeText(text)
        trackEvent('share', { content_type: 'cart', item_count: items.length, value: subtotal, currency, method: 'copy_link' })
        toast.success('Résumé du panier copié.')
      }
    } catch {
      // The share sheet can be dismissed by the customer.
    }
  }

  if (!isDemo && items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <EmptyState
          icon={ShoppingBag}
          title="Votre panier est vide"
          description="Parcourez le catalogue pour ajouter des produits."
        />
        <div className="text-center">
          <Link to="/catalogue" className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--shop-text)] underline underline-offset-2">
            Voir le catalogue
            <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[min(48rem,var(--shop-content-width))] px-4 py-8 sm:px-6">
      {(config.heading || !isDemo) && (
        <div className="flex items-start justify-between gap-4">
          {config.heading ? <h1 className={`font-heading font-bold text-[var(--shop-text)] ${SECTION_HEADING_SCALE[themeConfig.textScale]}`}>{config.heading}</h1> : <span />}
          {!isDemo && (
            <button
              type="button"
              onClick={handleShareCart}
              aria-label="Partager le panier"
              style={{ borderRadius: 'var(--shop-radius)' }}
              className="inline-flex shrink-0 items-center gap-2 border border-[var(--shop-text)]/15 px-3 py-2 text-xs font-semibold text-[var(--shop-text)] hover:border-[var(--shop-text)] hover:bg-[var(--shop-text)]/5"
            >
              <Share2 size={15} aria-hidden /> Partager
            </button>
          )}
        </div>
      )}

      {!isDemo && config.showFreeDeliveryProgress !== false && (
        <div className="mt-6">
          <FreeDeliveryProgress shop={shop} subtotal={subtotal} />
        </div>
      )}

      <ul className="mt-8 divide-y divide-[var(--shop-text)]/10 border-t border-[var(--shop-text)]/10">
        {items.map((item) => (
          <li key={`${item.productId}:${item.variantId ?? ''}`} className="flex gap-5 py-5">
            <div className="h-24 w-24 shrink-0 overflow-hidden bg-sand-100" style={{ borderRadius: 'var(--shop-radius)' }}>
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-ink-200">
                  <ImageOff size={24} aria-hidden />
                </div>
              )}
            </div>

            <div className="flex flex-1 flex-col justify-between">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link to={`/produits/${item.slug}`} className="text-sm font-medium text-[var(--shop-text)] hover:underline">
                    {item.name}
                  </Link>
                  {item.variantName && (
                    <p className="text-sm text-[var(--shop-text)]/50">{item.variantName}</p>
                  )}
                </div>
                {!isDemo && (
                  <button
                    onClick={() => removeItem(item.productId, item.variantId)}
                    aria-label={`Supprimer ${item.name} du panier`}
                    className="text-[var(--shop-text)]/30 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <p className="text-sm text-[var(--shop-text)]/50">{formatCurrency(item.price, currency)} / unité</p>

              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {!isDemo ? (
                    <>
                      <button onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)} aria-label="Diminuer la quantité" className="text-[var(--shop-text)]/70 hover:text-[var(--shop-text)]"><Minus size={14} /></button>
                      <span className="w-4 text-center text-sm font-medium text-[var(--shop-text)]">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)} disabled={item.quantity >= item.stock} aria-label="Augmenter la quantité" className="text-[var(--shop-text)]/70 hover:text-[var(--shop-text)] disabled:opacity-30"><Plus size={14} /></button>
                    </>
                  ) : (
                    <span className="text-sm text-[var(--shop-text)]/60">Qté : {item.quantity}</span>
                  )}
                </div>
                <p className="font-semibold text-[var(--shop-text)]">
                  {formatCurrency(item.price * item.quantity, currency)}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between border-t border-[var(--shop-text)]/10 pt-4">
        <div>
          <span className="block text-base font-semibold text-[var(--shop-text)]">Total</span>
          <Link to="/catalogue" className="mt-1 inline-block text-xs text-[var(--shop-text)]/60 underline underline-offset-2 hover:text-[var(--shop-text)]">
            Continuer mes achats
          </Link>
        </div>
        <span className="text-lg font-bold text-[var(--shop-text)]">{formatCurrency(subtotal, currency)}</span>
      </div>

      {!isDemo && (
        <Link
          to="/commande"
          style={{ borderRadius: 'var(--shop-radius)' }}
          className="mt-6 flex w-full items-center justify-center gap-2 bg-[var(--shop-button)] py-4 text-center text-sm font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90"
        >
          Passer la commande
          <ArrowRight size={16} aria-hidden />
        </Link>
      )}
      {isDemo && (
        <Link
          to="/commande"
          style={{ borderRadius: 'var(--shop-radius)' }}
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
    <div className="space-y-4">
      <div>
        <label className={editorLabelClass}>Titre</label>
        <input
          value={config.heading}
          onChange={(e) => onChange({ ...config, heading: e.target.value })}
          className={editorInputClass}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={config.showFreeDeliveryProgress !== false}
          onChange={() => onChange({ ...config, showFreeDeliveryProgress: config.showFreeDeliveryProgress === false })}
          className="accent-brand-600"
        />
        Barre de progression vers la livraison gratuite
      </label>
    </div>
  )
}
