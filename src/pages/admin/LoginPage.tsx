import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Mail, Lock } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/features/auth/AuthContext'
import { GoogleSignInButton } from '@/features/auth/GoogleSignInButton'
import { usePageSeo } from '@/hooks/usePageSeo'

const inputClass =
  'w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none'

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
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-sand-50 to-white px-4">
      <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-brand-100 opacity-50 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute bottom-0 left-0 h-56 w-56 rounded-full bg-gold-300 opacity-20 blur-3xl" aria-hidden />

      <div className="relative w-full max-w-sm rounded-2xl border border-sand-200 bg-white p-8 shadow-xl shadow-ink-900/5">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <Logo size={40} withWordmark={false} />
          <h1 className="font-heading text-xl font-bold text-ink-900">Espace boutique</h1>
          <p className="text-sm text-gray-500">Connectez-vous pour gérer votre boutique</p>
        </div>

        <GoogleSignInButton label="Se connecter avec Google" />

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-sand-200" />
          <span className="text-xs font-medium text-gray-400">ou avec votre email</span>
          <div className="h-px flex-1 bg-sand-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <div className="relative mt-1">
              <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <Link to="/mot-de-passe-oublie" className="text-xs font-medium text-brand-700 hover:text-brand-800">
                Mot de passe oublié ?
              </Link>
            </div>
            <div className="relative mt-1">
              <Lock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

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
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? 'Connexion…' : 'Se connecter'}
            {!loading && <ArrowRight size={15} aria-hidden />}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Pas encore de boutique ?{' '}
          <Link to="/inscription" className="font-medium text-brand-700 hover:text-brand-800">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  )
}