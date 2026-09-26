import { CheckCircle2, MessageCircle } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useTenant } from '@/features/tenant/TenantContext'
import { useStorefrontCapabilities } from '@/features/store-builder/useStorefrontCapabilities'
import { catalogCtaLabel, getStorefrontVocabulary } from '@/config/storefrontVocabulary'
import { usePageSeo } from '@/hooks/usePageSeo'
import { formatCurrency, whatsappHref } from '@/utils/format'
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
  customerName: string
}

const shape = { borderRadius: 'var(--shop-radius)' }

/** Récapitulatif d'une commande déjà enregistrée : le checkout a ouvert WhatsApp
 *  avec le message pré-rempli, cette page n'est qu'un reçu (et le point de retour
 *  quand l'acheteur revient de WhatsApp). */
export function OrderConfirmationPage() {
  const { shop } = useTenant()
  const { state } = useLocation()
  const confirmation = state as OrderConfirmationState | null
  const vocab = getStorefrontVocabulary(useStorefrontCapabilities(shop))

  usePageSeo({
    title: confirmation ? `Commande ${confirmation.orderNumber}` : 'Commande enregistrée',
    noindex: true,
    siteName: shop?.name,
  })

  if (!shop) return null

  // Sans état de navigation (lien rouvert), on ne connaît ni le détail ni le numéro
  // lisible : on rassure sans afficher l'identifiant interne.
  const whatsappTarget = confirmation?.whatsappUrl ?? (shop.whatsapp_number ? whatsappHref(shop.whatsapp_number) : null)
  const firstName = confirmation?.customerName.trim().split(/\s+/)[0]

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <div className="text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
          <CheckCircle2 size={32} className="text-emerald-600" aria-hidden />
        </span>
        <h1 className="mt-4 font-heading text-2xl font-bold text-[var(--shop-text)]">Commande enregistrée !</h1>
        <p className="mt-2 text-sm text-[var(--shop-text)]/70" role="status">
          {confirmation ? (
            <>
              Commande <span className="font-semibold text-[var(--shop-text)]">{confirmation.orderNumber}</span>
              {firstName ? ` — merci ${firstName} !` : ' — merci !'}
            </>
          ) : (
            'Votre commande est bien enregistrée.'
          )}
        </p>
        <p className="mt-1 text-sm text-[var(--shop-text)]/70">Le vendeur la confirme avec vous sur WhatsApp.</p>
      </div>

      {confirmation && (
        <>
          <div className="mt-8 border-t border-[var(--shop-text)]/10 pt-6">
            <ul className="space-y-1.5 text-sm text-[var(--shop-text)]/80">
              {confirmation.items.map((item, index) => (
                <li key={`${item.productName}-${index}`} className="flex justify-between gap-4">
                  <span>
                    {item.variantName ? `${item.productName} (${item.variantName})` : item.productName} × {item.quantity}
                    {item.options?.map((opt) => (
                      <span key={opt.label} className="block text-xs text-[var(--shop-text)]/60">
                        {opt.label} : {opt.value}
                      </span>
                    ))}
                  </span>
                  <span className="shrink-0">{formatCurrency(item.subtotal, confirmation.currency)}</span>
                </li>
              ))}
            </ul>
            {confirmation.deliveryFee > 0 && (
              <div className="mt-2 flex justify-between text-sm text-[var(--shop-text)]/80">
                <span>Livraison</span>
                <span>{formatCurrency(confirmation.deliveryFee, confirmation.currency)}</span>
              </div>
            )}
            <div className="mt-3 flex justify-between border-t border-[var(--shop-text)]/10 pt-3 font-semibold text-[var(--shop-text)]">
              <span>Total</span>
              <span>{formatCurrency(confirmation.total, confirmation.currency)}</span>
            </div>
            <p className="mt-2 text-xs text-[var(--shop-text)]/60">
              {confirmation.paymentMethod === 'mobile_money' ? 'Paiement par Mobile Money.' : 'Paiement à la livraison.'}
            </p>
          </div>

          {confirmation.paymentMethod === 'mobile_money' && confirmation.paymentInstructions?.trim() && (
            <div className="mt-4 bg-[var(--shop-text)]/5 p-4 text-sm text-[var(--shop-text)]/85" style={shape}>
              <p className="font-semibold text-[var(--shop-text)]">Modalités de paiement :</p>
              <p className="mt-1 whitespace-pre-line">{confirmation.paymentInstructions}</p>
            </div>
          )}
        </>
      )}

      {whatsappTarget && (
        <a
          href={whatsappTarget}
          target="_blank"
          rel="noreferrer"
          style={shape}
          className="mt-8 flex items-center justify-center gap-2 border border-[var(--shop-secondary-button-text)]/20 py-3 text-sm font-semibold text-[var(--shop-secondary-button-text)] transition-colors hover:border-[var(--shop-secondary-button-text)]/50"
        >
          <MessageCircle size={16} className="shrink-0" aria-hidden />
          {confirmation ? 'Rouvrir la conversation WhatsApp' : 'Écrire au vendeur sur WhatsApp'}
        </a>
      )}

      <div className="mt-8 flex flex-col items-center gap-2 text-sm">
        <Link to="/compte" className="font-medium text-[var(--shop-text)] underline underline-offset-2">
          Suivre mes commandes
        </Link>
        <Link to={vocab.catalogHref} className="text-[var(--shop-text)]/60 hover:text-[var(--shop-text)]">
          {catalogCtaLabel(vocab)}
        </Link>
      </div>
    </div>
  )
}
