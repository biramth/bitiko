import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { initPostHog, isPostHogReady, posthog } from '@/lib/posthog'

/**
 * PostHog product analytics (plateforme + vitrines) : pages vues sur chaque
 * navigation, et le visiteur identifié dès qu'un compte est connecté (pour
 * suivre un parcours au-delà d'une session), remis à zéro à la déconnexion.
 * No-op sans VITE_POSTHOG_KEY. Chargé par `DeferredThirdParty` — jamais dans
 * le chemin critique du premier rendu.
 */
export function PostHogTracking() {
  const location = useLocation()
  const { session } = useAuth()
  const identifiedIdRef = useRef<string | null>(null)

  useEffect(() => {
    initPostHog()
  }, [])

  useEffect(() => {
    if (!isPostHogReady()) return
    posthog.capture('$pageview', { $current_url: window.location.href })
  }, [location.pathname, location.search])

  useEffect(() => {
    if (!isPostHogReady()) return
    const userId = session?.user.id ?? null
    if (userId === identifiedIdRef.current) return
    if (userId) {
      posthog.identify(userId, { email: session?.user.email })
    } else if (identifiedIdRef.current) {
      posthog.reset()
    }
    identifiedIdRef.current = userId
  }, [session])

  return null
}
