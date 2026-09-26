import { MessageCircle, Phone } from 'lucide-react'
import { formatPhoneNumberForDisplay } from '@/utils/phone'
import { telUrl, whatsappUrl } from './bookingHelpers'

/** Numéro du client + boutons Appeler / WhatsApp (message pré-rempli). Le
 *  commerçant prévient son client en un geste, sans recopier le numéro. */
export function ContactActions({ phone, message }: { phone: string; message: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="text-gray-600">{formatPhoneNumberForDisplay(phone)}</span>
      <a
        href={telUrl(phone)}
        className="inline-flex items-center gap-1 font-medium text-gray-600 hover:text-gray-900"
        aria-label={`Appeler ${phone}`}
      >
        <Phone size={13} aria-hidden /> Appeler
      </a>
      <a
        href={whatsappUrl(phone, message)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:text-emerald-800"
        aria-label={`Écrire sur WhatsApp à ${phone}`}
      >
        <MessageCircle size={13} aria-hidden /> WhatsApp
      </a>
    </div>
  )
}
