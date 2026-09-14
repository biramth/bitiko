import { useState } from 'react'
import { GoogleIcon } from '@/components/ui/GoogleIcon'
import { useAuth } from './AuthContext'

export function GoogleSignInButton({ label = 'Continuer avec Google' }: { label?: string }) {
  const { signInWithGoogle } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setLoading(true)
    setError(null)
    const { error: signInError } = await signInWithGoogle()
    if (signInError) {
      setError(signInError)
      setLoading(false)
    }
    // On success the browser is redirected to Google, then back to /auth/callback.
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
      >
        <GoogleIcon size={18} />
        {loading ? 'Redirection…' : label}
      </button>
      {error && <p className="mt-2 text-center text-sm text-red-600">{error}</p>}
    </div>
  )
}
