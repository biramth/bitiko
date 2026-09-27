import posthog from 'posthog-js'

/**
 * PostHog init, kept out of the hot path: only the lazy-loaded
 * `PostHogTracking` component (mounted by `DeferredThirdParty`) imports this
 * file, so `posthog-js` never lands in the main bundle. `trackEvent`/
 * `reportError` in `src/lib/analytics.ts` stay zero-cost by calling
 * `window.posthogCapture` instead of importing this module directly — the
 * same pattern `GoogleAnalytics` uses with `window.gtag`.
 */

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || 'https://eu.i.posthog.com'

declare global {
  interface Window {
    posthogCapture?: (name: string, params?: Record<string, unknown>) => void
  }
}

let initialized = false

/** No-op without VITE_POSTHOG_KEY (local dev, previews that don't set it…). Safe to call more than once. */
export function initPostHog(): void {
  if (initialized || !POSTHOG_KEY || typeof window === 'undefined') return
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    // Un profil complet ("person") n'est créé qu'à l'identification (compte
    // connecté) — les visiteurs anonymes des vitrines restent des évènements
    // sans profil, moins coûteux en volume.
    person_profiles: 'identified_only',
    // Les pages vues sont capturées à la main sur changement de route (SPA) —
    // voir PostHogTracking — plutôt que par l'écoute d'historique par défaut.
    capture_pageview: false,
    // Enregistrement de session et heatmaps activés par défaut par le SDK :
    // désactivés ici, non demandés, et l'admin affiche des données clients
    // (adresses, téléphones, commandes) qu'on ne veut pas capturer en DOM.
    // Activable plus tard depuis Réglages du projet PostHog si besoin.
    disable_session_recording: true,
    capture_heatmaps: false,
  })
  window.posthogCapture = (name, params) => posthog.capture(name, params)
  initialized = true
}

export function isPostHogReady(): boolean {
  return initialized
}

export { posthog }
