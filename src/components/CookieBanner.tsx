import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cookie, X } from 'lucide-react'
import { useTenant } from '@/features/tenant/TenantContext'
import { platformUrl } from '@/lib/tenant'
import {
  CONSENT_REOPEN_EVENT,
  getConsent,
  needsConsent,
  setConsent,
  type ConsentStatus,
} from '@/lib/cookieConsent'
import { buttonClass } from '@/components/ui/styles'

/**
 * Consentement aux traceurs (CNIL) sous forme de modale centrée, affichée
 * tant qu'aucun choix valide n'est stocké. Ce n'est PAS un « mur de cookies » :
 * aucun fond bloquant, la navigation reste libre derrière la carte. La croix
 * « décider plus tard » masque sans stocker (la modale reviendra à la
 * prochaine visite) ; « Tout refuser » vaut 6 mois comme « Tout accepter ».
 * Le retrait se fait via le lien « Cookies » des pieds de page.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(() => needsConsent())
  const { tenant } = useTenant()

  useEffect(() => {
    const onReopen = () => setVisible(true)
    window.addEventListener(CONSENT_REOPEN_EVENT, onReopen)
    return () => window.removeEventListener(CONSENT_REOPEN_EVENT, onReopen)
  }, [])

  if (!visible) return null

  const choose = (status: ConsentStatus) => {
    const previous = getConsent()?.status ?? null
    setConsent(status)
    setVisible(false)
    // Un retrait après acceptation laisse des traceurs déjà chargés en
    // mémoire : recharger garantit qu'ils ne mesurent plus rien.
    if (previous === 'accepted' && status === 'rejected') {
      window.location.reload()
    }
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6">
      <div
        role="dialog"
        aria-live="polite"
        aria-labelledby="cookie-banner-title"
        className="animate-cookie-modal pointer-events-auto w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-ink-900/10"
      >
        <div className="relative bg-gradient-to-br from-brand-600 via-brand-500 to-ink-900 px-5 pb-5 pt-5 sm:px-6">
          <div
            aria-hidden
            className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10"
          />
          <div
            aria-hidden
            className="absolute -bottom-14 right-16 h-28 w-28 rounded-full bg-gold-400/20"
          />
          <div className="relative flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25">
              <Cookie size={20} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="cookie-banner-title" className="font-heading text-lg font-bold text-white">
                Votre vie privée d'abord
              </h2>
              <p className="mt-0.5 text-[13px] text-white/80">
                Vous décidez, nous nous adaptons.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setVisible(false)}
              aria-label="Décider plus tard"
              title="Décider plus tard"
              className="relative -mr-1 -mt-1 rounded-full p-2 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            >
              <X size={18} aria-hidden />
            </button>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-6">
          <p className="text-sm leading-relaxed text-gray-600">
            Bitiko mesure sa fréquentation de façon <strong className="font-semibold text-gray-900">anonyme</strong> pour
            s'améliorer. Les outils tiers (Vercel, PostHog) ne se chargent que si vous acceptez.{' '}
            {tenant.type === 'platform' ? (
              <Link to="/legal/cookies" className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800">
                En savoir plus
              </Link>
            ) : (
              <a href={`${platformUrl()}/legal/cookies`} className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800">
                En savoir plus
              </a>
            )}
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => choose('rejected')}
              className={buttonClass({ variant: 'secondary', size: 'lg', className: 'min-h-11 flex-1' })}
            >
              Tout refuser
            </button>
            <button
              type="button"
              onClick={() => choose('accepted')}
              className={buttonClass({ size: 'lg', className: 'min-h-11 flex-1' })}
            >
              Tout accepter
            </button>
          </div>
          <p className="mt-3 text-center text-xs text-gray-400">
            Choix conservé 6 mois · modifiable via « Cookies » en bas de page
          </p>
        </div>
      </div>
    </div>
  )
}
