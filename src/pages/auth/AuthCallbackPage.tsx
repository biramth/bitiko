import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { EmailOtpType, Session } from '@supabase/supabase-js'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { usePageSeo } from '@/hooks/usePageSeo'
import { PlatformAwareRedirect } from '@/features/platform/PlatformAwareRedirect'

/**
 * Landing point for the Google OAuth redirect and for email links (signup
 * confirmation, email change) that carry a `token_hash`. OAuth still relies
 * on supabase-js parsing the `code` from the URL (detectSessionInUrl), since
 * that PKCE exchange always happens in the same browser that started it.
 * Email links are verified explicitly via verifyOtp instead, because the
 * PKCE code_verifier they'd otherwise need only exists in the browser that
 * requested the link — it's missing whenever someone opens the email on a
 * different device/browser than the one they signed up with, which used to
 * make the link fail with "expired or invalid".
 *
 * An email link is also how support impersonation lands here (an operator is
 * already signed in when the message link swaps the session to the shop
 * owner's). We therefore never decide where to go while the token is still
 * being verified: judging from the pre-swap session redirects an operator to
 * /plateforme first, and by the time the session flips they're on a page
 * that now says "Espace réservé" instead of the merchant dashboard.
 */
export function AuthCallbackPage() {
  usePageSeo({ title: 'Connexion — Bitiko', noindex: true })
  const { session, loading } = useAuth()
  const [searchParams] = useSearchParams()
  const [result, setResult] = useState<{ session: Session | null; error: boolean } | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  useEffect(() => {
    if (!tokenHash || !type) return
    supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ data, error }) => {
      setResult({ session: data.session ?? null, error: !!error })
    })
  }, [tokenHash, type])

  useEffect(() => {
    const timeout = setTimeout(() => setTimedOut(true), 8000)
    return () => clearTimeout(timeout)
  }, [])

  if (tokenHash && type && !result) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Connexion en cours…" />
      </div>
    )
  }

  // A token was verified (or failed to verify). If it failed but the visitor
  // still holds a session — the support operator case — keep them where they
  // belong instead of showing a stranger's "lien expiré" page.
  if (tokenHash && type && result && result.error && session) {
    return <PlatformAwareRedirect fallback="/admin" />
  }

  if (session) {
    return <PlatformAwareRedirect fallback="/admin" />
  }

  if ((tokenHash && type && result?.error) || (!loading && timedOut)) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <ErrorMessage message="La connexion a échoué ou le lien a expiré. Réessaie depuis la page de connexion." />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner label="Connexion en cours…" />
    </div>
  )
}