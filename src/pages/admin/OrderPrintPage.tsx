import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Printer } from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { useShopPlan } from '@/features/billing/useShopPlan'
import { getOrderById } from '@/services/order.service'
import { ORDER_STATUS_LABELS } from '@/config/constants'
import { parseOrderOptions } from '@/utils/productOptions'
import { formatCurrency } from '@/utils/format'
import { PageLoader } from '@/components/ui/PageLoader'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { usePageSeo } from '@/hooks/usePageSeo'

/** Bon de commande imprimable (tous les plans) : une page A4 sobre, à donner au livreur ou au client.
 *  Généré dans le navigateur, sans bibliothèque PDF (Imprimer → Enregistrer en PDF). */
export function OrderPrintPage() {
  usePageSeo({ title: 'Bon de commande — Bitiko', noindex: true })
  const { id } = useParams<{ id: string }>()
  const { data: shop, isLoading: shopLoading } = useMyShop()
  const { plan } = useShopPlan(shop?.id)
  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn: () => getOrderById(id as string),
    enabled: !!id,
  })

  if (isLoading || shopLoading) return <PageLoader />
  if (isError || !order || !shop) return <ErrorMessage message="Commande introuvable." />

  const currency = shop.currency
  const money = (amount: number) => formatCurrency(amount, currency)
  const deliveryFee = Number(order.delivery_fee ?? 0)
  const settled = order.status === 'paid' || order.status === 'delivered'
  const created = new Date(order.created_at)
  const paymentLabel =
    order.payment_method === 'mobile_money'
      ? settled ? 'Réglée par mobile money' : 'À régler par mobile money'
      : settled ? 'Réglée en espèces' : 'À encaisser en espèces à la livraison'

  return (
    <div className="mx-auto max-w-3xl bg-white p-6 text-gray-900 print:max-w-none print:p-0 sm:p-10">
      <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
        <Link to={`/admin/commandes/${order.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900">
          <ArrowLeft size={14} aria-hidden /> Retour
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
        >
          <Printer size={15} aria-hidden /> Imprimer / Enregistrer en PDF
        </button>
      </div>

      <article>
        <header className="flex items-start justify-between gap-4 border-b-2 border-gray-900 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Bon de commande</p>
            <h1 className="mt-1 font-heading text-2xl font-bold">{shop.name}</h1>
            {shop.address && <p className="mt-1 text-sm text-gray-600">{shop.address}</p>}
            {shop.whatsapp_number && <p className="text-sm text-gray-600">{shop.whatsapp_number}</p>}
          </div>
          <div className="text-right">
            <p className="font-heading text-xl font-bold">{order.order_number}</p>
            <p className="text-sm text-gray-600">{created.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500">{ORDER_STATUS_LABELS[order.status]}</p>
          </div>
        </header>

        <section className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Client</h2>
            <p className="mt-1 font-medium">{order.customer_name}</p>
            <p className="text-sm">{order.customer_phone}</p>
            {order.customer_address && <p className="text-sm text-gray-700">{order.customer_address}</p>}
            {order.delivery_zone_name && <p className="text-sm text-gray-500">Zone : {order.delivery_zone_name}</p>}
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Paiement</h2>
            <p className="mt-1 font-medium">{paymentLabel}</p>
            {!settled && <p className="text-sm text-gray-700">Montant à régler : {money(Number(order.total))}</p>}
          </div>
        </section>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-gray-300 text-left text-xs uppercase tracking-wider text-gray-500">
              <th className="py-2 font-medium">Article</th>
              <th className="py-2 pl-3 text-right font-medium">Qté</th>
              <th className="py-2 pl-3 text-right font-medium">Prix</th>
              <th className="py-2 pl-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-gray-200 align-top">
                <td className="py-2 pr-3">
                  {item.product_name}
                  {item.variant_name && !item.product_name.includes(item.variant_name) ? ` (${item.variant_name})` : ''}
                  {parseOrderOptions(item.options).map((o) => (
                    <span key={o.label} className="block text-xs text-gray-500">{o.label} : {o.value}</span>
                  ))}
                </td>
                <td className="py-2 pl-3 text-right tabular-nums">{item.quantity}</td>
                <td className="py-2 pl-3 text-right tabular-nums">{money(Number(item.unit_price))}</td>
                <td className="py-2 pl-3 text-right tabular-nums">{money(Number(item.subtotal))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="tabular-nums">
            <tr>
              <td colSpan={3} className="pt-3 pr-3 text-right text-gray-600">Sous-total</td>
              <td className="pt-3 text-right">{money(Number(order.total) - deliveryFee)}</td>
            </tr>
            <tr>
              <td colSpan={3} className="pr-3 text-right text-gray-600">Livraison</td>
              <td className="text-right">{money(deliveryFee)}</td>
            </tr>
            <tr className="font-semibold">
              <td colSpan={3} className="pt-2 pr-3 text-right">Total</td>
              <td className="pt-2 text-right">{money(Number(order.total))}</td>
            </tr>
          </tfoot>
        </table>

        {order.notes && (
          <p className="mt-6 rounded border border-gray-200 px-3 py-2 text-sm text-gray-700">
            <span className="font-medium">Note : </span>{order.notes}
          </p>
        )}

        <footer className="mt-10 border-t border-gray-300 pt-3 text-xs text-gray-500">
          <p>Merci pour votre commande.</p>
          {!plan.removableBranding && <p className="mt-1">Généré avec Bitiko.</p>}
        </footer>
      </article>
    </div>
  )
}
