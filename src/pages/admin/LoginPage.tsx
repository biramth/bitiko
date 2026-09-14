import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/features/auth/AuthContext'
import { GoogleSignInButton } from '@/features/auth/GoogleSignInButton'
import { usePageSeo } from '@/hooks/usePageSeo'

export function LoginPage() {
  usePageSeo({ title: 'Connexion — Bitiko', noindex: true })
  const { session, signIn, resendConfirmation } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [resent, setResent] = useState(false)
  const [loading, setLoading] = useState(false)

  if (session) {
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/admin'
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setUnconfirmed(false)
    const { error: signInError } = await signIn(email, password)
    setLoading(false)
    if (signInError) {
      if (signInError.toLowerCase().includes('email not confirmed')) {
        setUnconfirmed(true)
      } else {
        setError('Identifiants incorrects.')
      }
      return
    }
    navigate('/admin', { replace: true })
  }

  const handleResend = async () => {
    setResent(false)
    setError(null)
    const { error: resendError } = await resendConfirmation(email)
    if (resendError) {
      setError(resendError)
    } else {
      setResent(true)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Logo size={32} withWordmark={false} />
          <h1 className="text-lg font-semibold text-gray-900">Espace boutique</h1>
          <p className="text-sm text-gray-500">Connectez-vous pour gérer votre boutique</p>
        </div>

        <GoogleSignInButton label="Se connecter avec Google" />

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-400">ou</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {unconfirmed && (
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              <p>Ton email n'est pas encore confirmé.</p>
              {resent ? (
                <p className="mt-1 font-medium">Email renvoyé — vérifie ta boîte de réception.</p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  className="mt-1 font-medium underline hover:no-underline"
                >
                  Renvoyer l'email de confirmation
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Pas encore de boutique ?{' '}
          <Link to="/inscription" className="font-medium text-brand-700">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  )
}
