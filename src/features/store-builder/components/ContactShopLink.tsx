import { MessageCircle } from 'lucide-react'
import { whatsappHref } from '@/utils/format'
import type { Shop } from '@/types'

/** Sortie de secours d'un état vide côté visiteur : joindre la boutique plutôt
 *  que rester devant une page vide. Rien si le commerçant n'a pas de WhatsApp. */
export function ContactShopLink({ shop }: { shop: Pick<Shop, 'whatsapp_number'> }) {
  if (!shop.whatsapp_number) return null
  return (
    <a
      href={whatsappHref(shop.whatsapp_number)}
      target="_blank"
      rel="noreferrer"
      style={{ borderRadius: 'var(--shop-radius)' }}
      className="mt-1 inline-flex items-center gap-2 border border-[var(--shop-secondary-button-text)]/20 px-4 py-2.5 text-sm font-semibold text-[var(--shop-secondary-button-text)] transition-colors hover:border-[var(--shop-secondary-button-text)]/50"
    >
      <MessageCircle size={16} aria-hidden />
      Nous écrire sur WhatsApp
    </a>
  )
}
