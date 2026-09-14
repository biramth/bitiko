import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/features/auth/AuthContext'
import { GoogleSignInButton } from '@/features/auth/GoogleSignInButton'
import { usePageSeo } from '@/hooks/usePageSeo'

export function SignupPage() {
  usePageSeo({ title: 'Créer ta boutique — Bitiko', noindex: true })
  const { session, signUp, resendConfirmation } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)
  const [resent, setResent] = useState(false)

  if (session) return <Navigate to="/admin" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    setLoading(true)
    setError(null)
    const result = await signUp(email, password)
    setLoading(false)

    if (result.error) {
      setError(
        result.error.includes('already registered')
          ? 'Un compte existe déjà avec cet email.'
          : 'Impossible de créer le compte. Réessayez.',
      )
      return
    }

    if (result.hasSession) {
      navigate('/admin/onboarding', { replace: true })
    } else {
      setCheckEmail(true)
    }
  }

  if (checkEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <Logo size={32} withWordmark={false} className="justify-center" />
          <h1 className="mt-3 text-lg font-semibold text-gray-900">Vérifiez votre email</h1>
          <p className="mt-2 text-sm text-gray-600">
            Un email de confirmation a été envoyé à <strong>{email}</strong>. Clique sur le lien
            puis connecte-toi pour créer ta boutique.
          </p>
          {resent ? (
            <p className="mt-3 text-sm font-medium text-emerald-700">Email renvoyé.</p>
          ) : (
            <button
              type="button"
              onClick={async () => {
                const { error: resendError } = await resendConfirmation(email)
                if (resendError) {
                  setError(resendError)
                } else {
                  setResent(true)
                }
              }}
              className="mt-3 text-sm font-medium text-brand-700 underline hover:no-underline"
            >
              Renvoyer l'email
            </button>
          )}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-4">
            <Link to="/admin/login" className="inline-block text-sm font-medium text-brand-700">
              Aller à la connexion
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Logo size={32} withWordmark={false} />
          <h1 className="text-lg font-semibold text-gray-900">Créer ta boutique</h1>
          <p className="text-sm text-gray-500">Crée ton compte pour commencer</p>
        </div>

        <GoogleSignInButton label="S'inscrire avec Google" />

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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Déjà un compte ?{' '}
          <Link to="/admin/login" className="font-medium text-brand-700">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
