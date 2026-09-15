import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/features/auth/AuthContext'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { usePageSeo } from '@/hooks/usePageSeo'

/**
 * Landing point for the "reset password" email link. supabase-js parses the
 * recovery code from the URL and establishes a session automatically
 * (detectSessionInUrl, same mechanism AuthCallbackPage relies on for OAuth/
 * email confirmation) — this page waits for that session, then lets the
 * user set a new password via updateUser.
 */
export function ResetPasswordPage() {
  usePageSeo({ title: 'Nouveau mot de passe — Bitiko', noindex: true })
  const { session, loading, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [timedOut, setTimedOut] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => setTimedOut(true), 8000)
    return () => clearTimeout(timeout)
  }, [])

  useEffect(() => {
    if (!done) return
    const timeout = setTimeout(() => navigate('/admin', { replace: true }), 1500)
    return () => clearTimeout(timeout)
  }, [done, navigate])

  if (!loading && !session && timedOut) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <ErrorMessage message="Ce lien a expiré ou n'est plus valide. Demandez-en un nouveau depuis la page de connexion." />
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Vérification du lien…" />
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (password !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }
    setSubmitting(true)
    setError(null)
    const { error: updateError } = await updatePassword(password)
    setSubmitting(false)
    if (updateError) {
      setError('Impossible de mettre à jour le mot de passe. Réessayez.')
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <Logo size={32} withWordmark={false} className="justify-center" />
          <h1 className="mt-3 text-lg font-semibold text-gray-900">Mot de passe mis à jour</h1>
          <p className="mt-2 text-sm text-gray-600">Redirection vers votre tableau de bord…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Logo size={32} withWordmark={false} />
          <h1 className="text-lg font-semibold text-gray-900">Nouveau mot de passe</h1>
          <p className="text-sm text-gray-500">Choisissez un nouveau mot de passe pour votre compte.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Nouveau mot de passe
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirmer le mot de passe
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  )
}
