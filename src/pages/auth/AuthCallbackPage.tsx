import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { usePageSeo } from '@/hooks/usePageSeo'

/**
 * Landing point for both the email-confirmation link and the Google OAuth
 * redirect. supabase-js parses the token from the URL and updates the
 * session automatically (detectSessionInUrl) — this page just waits for
 * that and then hands off to the normal admin routing (which redirects to
 * onboarding if the account has no shop yet).
 */
export function AuthCallbackPage() {
  usePageSeo({ title: 'Connexion — Bitiko', noindex: true })
  const { session, loading } = useAuth()
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => setTimedOut(true), 8000)
    return () => clearTimeout(timeout)
  }, [])

  if (session) return <Navigate to="/admin" replace />

  if (!loading && timedOut) {
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
