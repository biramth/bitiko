import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { MapPin, MessageCircle, ShieldCheck, ShoppingBag } from 'lucide-react'
import { useCart } from '@/features/cart/CartContext'
import { useTenant } from '@/features/tenant/TenantContext'
import {
  createOrder,
  buildWhatsAppMessage,
  buildWhatsAppUrl,
} from '@/services/order.service'
import { listDeliverySecteurs, listDeliveryVilles } from '@/services/deliverySecteur.service'
import { formatCurrency, resolveZoneDeliveryFee } from '@/utils/format'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import type { CartItem, PaymentMethod } from '@/types'
import { useIsEmbeddedPreview } from '../useEmbeddedPreview'
import { buildDemoCart } from '../demoCart'
import type { Shop } from '@/types'
import type { CheckoutSectionConfig, ThemeConfig } from '@/types/builder'
import type { OrderConfirmationState } from '@/pages/store/OrderConfirmationPage'
import { trackEvent } from '@/lib/analytics'
import { SECTION_HEADING_SCALE } from '@/config/themeTokens'
import { editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'

function CheckoutFlow({
  items,
  subtotal,
  demo,
  showTrustBadges,
  themeConfig,
}: {
  items: CartItem[]
  subtotal: number
  demo: boolean
  showTrustBadges: boolean
  themeConfig: ThemeConfig
}) {
  const { shop } = useTenant()
  const { clear } = useCart()
  const navigate = useNavigate()
  const currency = shop?.currency ?? 'XOF'

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [deliveryVilleId, setDeliveryVilleId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod')
  const whatsappWindowRef = useRef<Window | null>(null)

  const { data: secteurs = [] } = useQuery({
    queryKey: ['delivery-secteurs', shop?.id],
    queryFn: () => listDeliverySecteurs(shop!.id),
    enabled: !!shop?.id,
  })
  const { data: villes = [] } = useQuery({
    queryKey: ['delivery-villes', shop?.id],
    queryFn: () => listDeliveryVilles(shop!.id),
    enabled: !!shop?.id,
  })

  const activeSecteurs = secteurs.filter((s) => s.is_active)
  const villesAvecSecteur = villes
    .filter((v) => v.is_active)
    .map((ville) => ({ ville, secteur: secteurs.find((s) => s.id === ville.secteur_id) ?? null }))
    .filter((row) => row.secteur?.is_active)
  const groupes = activeSecteurs
    .map((secteur) => ({ secteur, villes: villesAvecSecteur.filter((row) => row.secteur?.id === secteur.id).map((row) => row.ville) }))
    .filter((g) => g.villes.length > 0)

  const selectedVille = villesAvecSecteur.find((row) => row.ville.id === deliveryVilleId)?.ville ?? villesAvecSecteur[0]?.ville ?? null
  const selectedSecteur = selectedVille ? (secteurs.find((s) => s.id === selectedVille.secteur_id) ?? null) : null

  const deliveryFee = shop ? resolveZoneDeliveryFee(shop, subtotal, Number(selectedSecteur?.fee ?? 0)) : 0
  const estimate = subtotal + deliveryFee

  const mutation = useMutation({
    mutationFn: async () => {
      if (!shop) throw new Error('Boutique introuvable')
      return createOrder({
        shopId: shop.id,
        customerName,
        customerPhone,
        customerAddress,
        items,
        deliveryFee,
        deliveryZoneName: selectedVille?.name ?? 'Livraison standard',
        paymentMethod,
      })
    },
    onSuccess: (result) => {
      trackEvent('purchase', { transaction_id: result.orderId, value: result.total, currency, item_count: result.items.length })
      if (!demo) clear()
      const message = buildWhatsAppMessage({
        orderNumber: result.orderNumber,
        items: result.items,
        deliveryFee,
        deliveryZoneName: selectedVille?.name,
        paymentMethod,
        paymentInstructions: shop?.payment_instructions,
        total: result.total,
        customerName,
        customerPhone,
        customerAddress,
        formatCurrency: (amount) => formatCurrency(amount, currency),
      })
      const whatsappUrl = buildWhatsAppUrl(shop!.whatsapp_number, message)
      if (whatsappWindowRef.current) {
        whatsappWindowRef.current.location.href = whatsappUrl
      }
      navigate(`/commande/confirmation/${result.orderId}`, {
        replace: true,
        state: {
          orderNumber: result.orderNumber,
          total: result.total,
          items: result.items,
          deliveryFee,
          currency,
          paymentMethod,
          paymentInstructions: shop!.payment_instructions,
          whatsappUrl,
          autoOpenFailed: !whatsappWindowRef.current,
          customerName,
        } satisfies OrderConfirmationState,
      })
    },
    onError: () => {
      whatsappWindowRef.current?.close()
      whatsappWindowRef.current = null
    },
  })

  if (!shop) return null

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sand-100">
          <ShoppingBag size={26} className="text-[var(--shop-text)]/70" aria-hidden />
        </span>
        <p className="mt-3 text-[var(--shop-text)]/70">Votre panier est vide.</p>
        <Link to="/catalogue" className="mt-3 inline-block text-sm font-medium text-[var(--shop-text)] underline underline-offset-2">
          Voir le catalogue
        </Link>
      </div>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    trackEvent('begin_checkout', { value: estimate, currency, item_count: items.length })
    whatsappWindowRef.current = window.open('', '_blank')
    mutation.mutate()
  }

  return (
    <div className="mx-auto max-w-[min(32rem,var(--shop-content-width))] px-4 py-8 sm:px-6">
      <h1 className={`font-heading font-bold text-[var(--shop-text)] ${SECTION_HEADING_SCALE[themeConfig.textScale]}`}>Finaliser la commande</h1>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-[var(--shop-text)]/65" aria-label="Garanties de commande">
        <p className="border border-[var(--shop-text)]/10 px-3 py-2">Prix et stock vérifiés à la commande</p>
        <p className="border border-[var(--shop-text)]/10 px-3 py-2">Paiement confirmé avec le vendeur sur WhatsApp</p>
      </div>

      <div className="mt-6 border-y border-[var(--shop-text)]/10 py-5">
        <ul className="space-y-1.5 text-sm text-[var(--shop-text)]/80">
          {items.map((item) => (
            <li key={`${item.productId}:${item.variantId ?? ''}`} className="flex justify-between">
              <span>
                {item.variantName ? `${item.name} (${item.variantName})` : item.name} × {item.quantity}
              </span>
              <span>{formatCurrency(item.price * item.quantity, currency)}</span>
            </li>
          ))}
        </ul>
        {selectedVille && (
          <div className="mt-2 flex justify-between text-sm text-[var(--shop-text)]/80">
            <span>Ville</span>
            <span>{selectedVille.name}</span>
          </div>
        )}
        {deliveryFee > 0 ? (
          <div className="mt-2 flex justify-between text-sm text-[var(--shop-text)]/80">
            <span>Livraison</span>
            <span>{formatCurrency(deliveryFee, currency)}</span>
          </div>
        ) : (
          <div className="mt-2 flex justify-between text-sm text-emerald-600">
            <span>Livraison</span>
            <span>Offerte</span>
          </div>
        )}
        <div className="mt-3 flex justify-between border-t border-[var(--shop-text)]/10 pt-3 font-semibold text-[var(--shop-text)]">
          <span>Total estimé</span>
          <span className="text-lg font-bold">{formatCurrency(estimate, currency)}</span>
        </div>
        <p className="mt-2 text-xs text-[var(--shop-text)]/50">
          Le total définitif est recalculé au moment de la commande (prix et stock à jour).
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label htmlFor="customerName" className="block text-sm font-medium text-[var(--shop-text)]/80">Nom complet</label>
          <input id="customerName" name="name" autoComplete="name" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="mt-1 w-full border-b border-[var(--shop-text)]/15 bg-transparent py-2 text-sm text-[var(--shop-text)] focus:border-[var(--shop-text)] focus:outline-none" />
        </div>
        <div>
          <label htmlFor="customerPhone" className="block text-sm font-medium text-[var(--shop-text)]/80">Numéro de téléphone</label>
          <input id="customerPhone" name="tel" type="tel" autoComplete="tel" inputMode="tel" required value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+221 XX XXX XX XX" className="mt-1 w-full border-b border-[var(--shop-text)]/15 bg-transparent py-2 text-sm text-[var(--shop-text)] focus:border-[var(--shop-text)] focus:outline-none" />
        </div>
        <div>
          <label htmlFor="customerAddress" className="block text-sm font-medium text-[var(--shop-text)]/80">Adresse de livraison</label>
          <textarea id="customerAddress" name="street-address" autoComplete="street-address" required rows={2} value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Quartier, ville, point de repère…" className="mt-1 w-full resize-none border-b border-[var(--shop-text)]/15 bg-transparent py-2 text-sm text-[var(--shop-text)] focus:border-[var(--shop-text)] focus:outline-none" />
        </div>

        {groupes.length > 0 && (
          <div>
            <label htmlFor="deliveryVille" className="block text-sm font-medium text-[var(--shop-text)]/80">Ville de livraison</label>
            <select id="deliveryVille" value={selectedVille?.id ?? ''} onChange={(e) => setDeliveryVilleId(e.target.value)} className="mt-1 w-full border-b border-[var(--shop-text)]/15 bg-transparent py-2 text-sm text-[var(--shop-text)] focus:border-[var(--shop-text)] focus:outline-none">
              {groupes.map(({ secteur, villes }) => (
                <optgroup key={secteur.id} label={`${secteur.name} — ${Number(secteur.fee) > 0 ? formatCurrency(Number(secteur.fee), currency) : 'gratuite'}`}>
                  {villes.map((ville) => (
                    <option key={ville.id} value={ville.id}>{ville.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="mt-1 flex items-center gap-1 text-xs text-[var(--shop-text)]/50">
              <MapPin size={12} aria-hidden /> Choisissez votre ville : le tarif du secteur s'affiche à côté.
            </p>
          </div>
        )}

        <div>
          <span className="block text-sm font-medium text-[var(--shop-text)]/80">Paiement</span>
          <div className="mt-2 space-y-2">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[var(--shop-text)]">
              <input type="radio" name="paymentMethod" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="accent-[var(--shop-accent)]" />
              Paiement à la livraison
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[var(--shop-text)]">
              <input type="radio" name="paymentMethod" value="mobile_money" checked={paymentMethod === 'mobile_money'} onChange={() => setPaymentMethod('mobile_money')} className="accent-[var(--shop-accent)]" />
              Mobile money avec le vendeur
            </label>
          </div>
          <p className="mt-1 text-xs text-[var(--shop-text)]/50">
            Aucun paiement n'est effectué ici. Le vendeur vous confirme le montant et le moyen de paiement sur WhatsApp.
          </p>
        </div>

        {mutation.isError && (
          <ErrorMessage message="Impossible de créer la commande. Vérifiez votre panier et réessayez." />
        )}

        <button
          type="submit"
          disabled={mutation.isPending || demo}
          style={{ borderRadius: 'var(--shop-radius)' }}
          className="w-full bg-[var(--shop-button)] py-4 text-sm font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {demo ? 'Aperçu — la commande est désactivée' : mutation.isPending ? 'Création de la commande…' : 'Commander via WhatsApp'}
        </button>

        {showTrustBadges && (
          <ul className="flex flex-col gap-2 text-xs text-[var(--shop-text)]/60">
            <li className="flex items-center gap-2">
              <ShieldCheck size={14} className="shrink-0 text-[var(--shop-text)]/40" aria-hidden />
              Aucune carte bancaire requise — espèces ou Mobile Money, comme vous préférez.
            </li>
            <li className="flex items-center gap-2">
              <MessageCircle size={14} className="shrink-0 text-[var(--shop-text)]/40" aria-hidden />
              Le vendeur confirme votre commande sur WhatsApp juste après.
            </li>
          </ul>
        )}
      </form>
    </div>
  )
}

export function CheckoutRenderer({ shop, config, themeConfig }: { shop: Shop; config: CheckoutSectionConfig; themeConfig: ThemeConfig }) {
  const { items: realItems, subtotal: realSubtotal } = useCart()
  const isEmbeddedPreview = useIsEmbeddedPreview()
  const demo = isEmbeddedPreview && realItems.length === 0 ? buildDemoCart(shop) : null
  const items = demo ?? realItems
  const subtotal = demo ? demo.reduce((sum, i) => sum + i.price * i.quantity, 0) : realSubtotal
  const isDemo = demo !== null

  return (
    <>
      {config.heading && (
        <div className="mx-auto max-w-[min(32rem,var(--shop-content-width))] px-4 pt-8 sm:px-6">
          <h1 className={`font-heading font-bold text-[var(--shop-text)] ${SECTION_HEADING_SCALE[themeConfig.textScale]}`}>{config.heading}</h1>
        </div>
      )}
      <CheckoutFlow items={items} subtotal={subtotal} demo={isDemo} showTrustBadges={config.showTrustBadges !== false} themeConfig={themeConfig} />
    </>
  )
}

export function CheckoutEditor({ config, onChange }: SectionEditorProps<CheckoutSectionConfig>) {
  return (
    <div className="space-y-4">
      <div>
        <label className={editorLabelClass}>Titre (superposé)</label>
        <input value={config.heading} onChange={(e) => onChange({ ...config, heading: e.target.value })} className={editorInputClass} />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={config.showTrustBadges !== false}
          onChange={() => onChange({ ...config, showTrustBadges: config.showTrustBadges === false })}
          className="accent-brand-600"
        />
        Badges de réassurance (paiement, WhatsApp…)
      </label>
    </div>
  )
}
