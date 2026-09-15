import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/features/auth/AuthContext'
import { usePageSeo } from '@/hooks/usePageSeo'

export function ForgotPasswordPage() {
  usePageSeo({ title: 'Mot de passe oublié — Bitiko', noindex: true })
  const { resetPasswordForEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await resetPasswordForEmail(email)
    setLoading(false)
    // Always show the same confirmation, whether or not the email exists —
    // revealing which emails have an account would let anyone enumerate them.
    setSent(true)
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <Logo size={32} withWordmark={false} className="justify-center" />
          <h1 className="mt-3 text-lg font-semibold text-gray-900">Vérifiez vos emails</h1>
          <p className="mt-2 text-sm text-gray-600">
            Si un compte existe pour <strong>{email}</strong>, un lien de réinitialisation vient de lui être envoyé.
          </p>
          <div className="mt-4">
            <Link to="/admin/login" className="inline-block text-sm font-medium text-brand-700">
              Retour à la connexion
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
          <h1 className="text-lg font-semibold text-gray-900">Mot de passe oublié</h1>
          <p className="text-sm text-gray-500">
            Indiquez votre email, on vous envoie un lien pour en choisir un nouveau.
          </p>
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
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? 'Envoi…' : 'Envoyer le lien'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          <Link to="/admin/login" className="font-medium text-brand-700">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  )
}
