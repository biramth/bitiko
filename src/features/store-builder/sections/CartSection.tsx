import { Link } from 'react-router-dom'
import { PartyPopper, Share2, ShoppingBag, Truck } from 'lucide-react'
import { useCart } from '@/features/cart/CartContext'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency, formatPrice } from '@/utils/format'
import { formatOptionsInline, optionsKey } from '@/utils/productOptions'
import { useIsEmbeddedPreview } from '../useEmbeddedPreview'
import { buildDemoCart } from '../demoCart'
import type { Shop } from '@/types'
import type { CartLayout, CartSectionConfig, ThemeConfig } from '@/types/builder'
import { sectionHeadingClass } from '@/config/themeTokens'
import { editorHelpClass, editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'
import { resolveTextStyle } from '@/config/textStyle'
import { TextStyleField } from '../components/TextStyleControls'
import { VisualPicker } from '../components/VisualPicker'
import { SwatchBar, SwatchBlock, SwatchFrame } from '../components/LayoutSwatch'
import { trackEvent } from '@/lib/analytics'
import { catalogCtaLabel, getStorefrontVocabulary } from '@/config/storefrontVocabulary'
import { useStorefrontCapabilities } from '../useStorefrontCapabilities'
import { DeliveryPaymentInfo } from '../components/DeliveryPaymentInfo'
import { Minus, Plus, Trash2, ArrowRight } from 'lucide-react'
import { FadeImage } from '@/components/ui/FadeImage'

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
  const isEmbeddedPreview = useIsEmbeddedPreview()
  const demo = isEmbeddedPreview && realItems.length === 0 ? buildDemoCart(shop) : null
  const items = demo ?? realItems
  const subtotal = demo ? demo.reduce((sum, i) => sum + i.price * i.quantity, 0) : realSubtotal
  const currency = shop.currency ?? 'XOF'
  const isDemo = demo !== null
  const aside = (config.layout ?? 'stacked') === 'summary-aside'
  const vocab = getStorefrontVocabulary(useStorefrontCapabilities(shop))

  const handleShareCart = () => {
    // Partage WhatsApp d'abord (même logique que la fiche produit) : le résumé
    // du panier arrive déjà rédigé dans la conversation.
    const lines = items.map((item) => `- ${item.name} x${item.quantity} : ${formatCurrency(item.price * item.quantity, currency)}`)
    const text = `Mon panier chez ${shop.name}\n${lines.join('\n')}\nTotal : ${formatCurrency(subtotal, currency)}\n\nJe souhaite confirmer cette sélection avec vous.`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    trackEvent('share', { content_type: 'cart', item_count: items.length, value: subtotal, currency, method: 'whatsapp' })
  }

  if (!isDemo && items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <EmptyState
          icon={ShoppingBag}
          title="Votre panier est vide"
          description="Ajoutez des articles pour préparer votre commande."
        />
        <div className="text-center">
          <Link to={vocab.catalogHref} className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--shop-text)] underline underline-offset-2">
            {catalogCtaLabel(vocab)}
            <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={`mx-auto max-w-[min(48rem,var(--shop-content-width))] px-4 py-8 sm:px-6 ${aside ? 'lg:max-w-[var(--shop-content-width)]' : ''}`}>
      {(config.heading || !isDemo) && (
        <div className="flex items-start justify-between gap-4">
          {config.heading ? <h1 className={`font-heading font-bold text-[var(--shop-text)] ${sectionHeadingClass(themeConfig)}`} style={resolveTextStyle(config.headingStyle)}>{config.heading}</h1> : <span />}
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

      <div className={aside ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-10' : undefined}>
      <ul className="mt-8 divide-y divide-[var(--shop-text)]/10 border-t border-[var(--shop-text)]/10">
        {items.map((item) => (
          <li key={`${item.productId}:${item.variantId ?? ''}:${optionsKey(item.options)}`} className="flex gap-3 py-5 sm:gap-5">
            <div className="h-20 w-20 shrink-0 overflow-hidden bg-sand-100 sm:h-24 sm:w-24" style={{ borderRadius: 'var(--shop-radius)' }}>
              {item.imageUrl ? (
                <FadeImage src={item.imageUrl} alt={item.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-[var(--shop-surface)]">
                  <span aria-hidden className="font-heading text-2xl font-bold text-[var(--shop-accent)]/35">
                    {[...item.name.trim()][0]?.toUpperCase() ?? '•'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col justify-between">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <Link to={`/produits/${item.slug}`} className="break-words text-sm font-medium text-[var(--shop-text)] hover:underline">
                    {item.name}
                  </Link>
                  {item.variantName && (
                    <p className="text-sm text-[var(--shop-text)]/50">{item.variantName}</p>
                  )}
                  {item.options && item.options.length > 0 && (
                    <p className="text-sm text-[var(--shop-text)]/50">{formatOptionsInline(item.options)}</p>
                  )}
                </div>
                {!isDemo && (
                  <button
                    onClick={() => removeItem(item)}
                    aria-label={`Supprimer ${item.name} du panier`}
                    className="-mr-2 -mt-2 flex h-10 w-10 items-center justify-center text-[var(--shop-text)]/40 hover:text-red-600"
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                )}
              </div>
              <p className="text-sm text-[var(--shop-text)]/50">{formatPrice(item.price, currency, shop.tax_display)} / unité</p>

              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {!isDemo ? (
                    <>
                      <button onClick={() => updateQuantity(item, item.quantity - 1)} aria-label="Diminuer la quantité" className="-mx-2 flex h-10 w-10 items-center justify-center text-[var(--shop-text)]/70 hover:text-[var(--shop-text)]"><Minus size={14} aria-hidden /></button>
                      <span className="w-4 text-center text-sm font-medium text-[var(--shop-text)]" aria-live="polite">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item, item.quantity + 1)} disabled={item.quantity >= item.stock} aria-label="Augmenter la quantité" className="-mx-2 flex h-10 w-10 items-center justify-center text-[var(--shop-text)]/70 hover:text-[var(--shop-text)] disabled:opacity-30"><Plus size={14} aria-hidden /></button>
                    </>
                  ) : (
                    <span className="text-sm text-[var(--shop-text)]/60">Qté : {item.quantity}</span>
                  )}
                </div>
                <p className="shrink-0 whitespace-nowrap font-semibold text-[var(--shop-text)]">
                  {formatCurrency(item.price * item.quantity, currency)}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className={aside ? 'lg:sticky lg:top-24 lg:mt-8 lg:border lg:border-[var(--shop-text)]/10 lg:p-5' : undefined}>
      <div className={`mt-6 flex items-center justify-between border-t ${aside ? 'lg:mt-0 lg:border-t-0 lg:pt-0' : ''} border-[var(--shop-text)]/10 pt-4`}>
        <div>
          <span className="block text-base font-semibold text-[var(--shop-text)]">Sous-total</span>
          <Link to={vocab.catalogHref} className="mt-1 inline-block text-xs text-[var(--shop-text)]/60 underline underline-offset-2 hover:text-[var(--shop-text)]">
            Continuer mes achats
          </Link>
        </div>
        <span className="text-lg font-bold text-[var(--shop-text)]">{formatPrice(subtotal, currency, shop.tax_display)}</span>
      </div>
      <p className="mt-2 text-xs text-[var(--shop-text)]/60">Livraison calculée à l'étape suivante.</p>

      {!isDemo && (
        <Link
          to="/commande"
          style={{ borderRadius: 'var(--shop-radius)' }}
          className="mt-6 flex w-full items-center justify-center gap-2 bg-[var(--shop-button)] py-4 text-center text-sm font-semibold uppercase tracking-widest text-[var(--shop-button-text)] transition-opacity hover:opacity-90"
        >
          Passer la commande
          <ArrowRight size={16} aria-hidden />
        </Link>
      )}
      {isDemo && (
        <Link
          to="/commande"
          style={{ borderRadius: 'var(--shop-radius)' }}
          className="mt-6 flex w-full items-center justify-center gap-2 bg-[var(--shop-button)] py-4 text-center text-sm font-semibold uppercase tracking-widest text-[var(--shop-button-text)] opacity-50 pointer-events-none"
        >
          Passer la commande
          <ArrowRight size={16} aria-hidden />
        </Link>
      )}
      <DeliveryPaymentInfo shop={shop} className="mt-6" />
      </div>
      </div>
      {!isDemo && (
        <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 flex items-center justify-between gap-3 border-t border-[var(--shop-text)]/10 bg-[var(--shop-bg)] px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] sm:hidden">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--shop-text)]/55">
              {items.length} article{items.length > 1 ? 's' : ''}
            </p>
            <p className="truncate text-sm font-bold text-[var(--shop-text)]">{formatCurrency(subtotal, currency)}</p>
          </div>
          <Link
            to="/commande"
            style={{ borderRadius: 'var(--shop-radius)' }}
            className="flex shrink-0 items-center gap-2 bg-[var(--shop-button)] px-5 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--shop-button-text)] transition-opacity hover:opacity-90"
          >
            Commander <ArrowRight size={15} aria-hidden />
          </Link>
        </div>
      )}
    </div>
  )
}

const CART_LAYOUTS: { value: CartLayout; label: string; preview: React.ReactNode }[] = [
  {
    value: 'stacked',
    label: 'Empilé',
    preview: (
      <SwatchFrame className="flex-col gap-1">
        <SwatchBlock className="h-2 w-full" />
        <SwatchBlock className="h-2 w-full" />
        <SwatchBar w="w-1/2" />
      </SwatchFrame>
    ),
  },
  {
    value: 'summary-aside',
    label: 'Résumé à droite',
    preview: (
      <SwatchFrame className="gap-1">
        <span className="flex w-2/3 flex-col gap-1">
          <SwatchBlock className="h-2 w-full" />
          <SwatchBlock className="h-2 w-full" />
        </span>
        <SwatchBlock className="h-full w-1/3" />
      </SwatchFrame>
    ),
  },
]

export function CartEditor({ config, onChange }: SectionEditorProps<CartSectionConfig>) {
  return (
    <div className="space-y-4">
      <div>
        <label className={editorLabelClass}>Disposition</label>
        <div className="mt-1">
          <VisualPicker
            columns={2}
            value={config.layout ?? 'stacked'}
            onChange={(layout) => onChange({ ...config, layout })}
            options={CART_LAYOUTS}
          />
        </div>
        <p className={`mt-1.5 ${editorHelpClass}`}>
          « Résumé à droite » place le total et le bouton de commande dans une colonne fixe sur ordinateur.
        </p>
      </div>
      <div>
        <label className={editorLabelClass}>Titre</label>
        <input
          value={config.heading}
          onChange={(e) => onChange({ ...config, heading: e.target.value })}
          className={editorInputClass}
        />
        <p className={`mt-1 ${editorHelpClass}`}>Vide = aucun titre affiché.</p>
        <TextStyleField value={config.headingStyle} onChange={(headingStyle) => onChange({ ...config, headingStyle })} />
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
