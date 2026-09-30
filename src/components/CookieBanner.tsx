import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cookie } from 'lucide-react'
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
 * Bannière de consentement aux traceurs (CNIL) : affichée tant qu'aucun
 * choix valide n'est stocké, sans jamais bloquer la navigation (pas de
 * « mur de cookies »). « Tout refuser » est aussi simple que
 * « Tout accepter » : deux boutons équivalents. Le retrait se fait via le
 * lien « Cookies » des pieds de page (voir `reopenConsent`).
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
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Consentement aux cookies de mesure d'audience"
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-[max(1.25rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-xl sm:flex-row sm:items-center sm:gap-4 sm:p-5">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sand-100 text-brand-700">
            <Cookie size={18} aria-hidden />
          </span>
          <p className="min-w-0 text-sm text-gray-700">
            Nous mesurons la fréquentation de façon anonyme pour améliorer Bitiko. Les outils tiers
            (Vercel, PostHog) ne se chargent qu'avec votre accord.{' '}
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
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose('rejected')}
            className={buttonClass({ variant: 'secondary', className: 'min-h-11 flex-1 sm:flex-none' })}
          >
            Tout refuser
          </button>
          <button
            type="button"
            onClick={() => choose('accepted')}
            className={buttonClass({ className: 'min-h-11 flex-1 sm:flex-none' })}
          >
            Tout accepter
          </button>
        </div>
      </div>
    </div>
  )
}
