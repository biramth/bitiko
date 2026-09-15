import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { sendEmail } from './_lib/resendEmail.js'
import { newOrderEmailHtml } from './_lib/emailTemplates.js'

const FALLBACK_CURRENCY = 'XOF'

function formatPrice(amount: number, currency: string | null | undefined): string {
  const code = currency && /^[A-Z]{3}$/i.test(currency) ? currency.toUpperCase() : FALLBACK_CURRENCY
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: code, maximumFractionDigits: 0 }).format(amount)
  } catch {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount) + ' ' + code
  }
}

/**
 * Fired right after a storefront checkout succeeds — the customer is
 * anonymous (no auth header, matching create_order()'s own trust boundary:
 * this only ever reads back what create_order() already wrote, it never
 * takes order details from the request body), so anyone with an orderId
 * could in principle re-trigger this. Low-risk (a merchant just gets a
 * duplicate email for a real order of theirs) and not worth an
 * idempotency column for a fire-and-forget notification.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const { orderId } = req.body ?? {}
    if (typeof orderId !== 'string' || !orderId) {
      res.status(400).json({ error: 'orderId manquant.' })
      return
    }

    const admin = getSupabaseAdmin()
    const { data: order, error: orderError } = await admin
      .from('orders')
      .select(
        'id, order_number, total, customer_name, customer_phone, shop:shops(name, currency, owner_id), items:order_items(product_name, variant_name, quantity)',
      )
      .eq('id', orderId)
      .maybeSingle()
    if (orderError) throw orderError
    if (!order) {
      res.status(404).json({ error: 'Commande introuvable.' })
      return
    }

    const shop = order.shop as unknown as { name: string; currency: string | null; owner_id: string } | null
    if (!shop) {
      res.status(404).json({ error: 'Boutique introuvable.' })
      return
    }

    const { data: ownerData } = await admin.auth.admin.getUserById(shop.owner_id)
    const ownerEmail = ownerData.user?.email
    if (!ownerEmail) {
      res.status(200).json({ sent: false })
      return
    }

    const rootDomain = process.env.VITE_ROOT_DOMAIN
    const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https'
    const origin = rootDomain ? `https://${rootDomain}` : `${proto}://${req.headers.host}`

    await sendEmail({
      to: ownerEmail,
      subject: `Nouvelle commande #${order.order_number} — ${shop.name}`,
      html: newOrderEmailHtml({
        origin,
        shopName: shop.name,
        orderNumber: order.order_number,
        orderUrl: `${origin}/admin/commandes/${order.id}`,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        formattedTotal: formatPrice(Number(order.total), shop.currency),
        items: (order.items as { product_name: string; variant_name: string | null; quantity: number }[] | null ?? []).map(
          (item) => ({ productName: item.product_name, variantName: item.variant_name, quantity: item.quantity }),
        ),
      }),
    })

    res.status(200).json({ sent: true })
  } catch (err) {
    console.error('notify-new-order failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}
