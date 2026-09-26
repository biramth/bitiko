import { useState } from 'react'
import { GoogleIcon } from '@/components/ui/GoogleIcon'
import { useAuth } from './AuthContext'
import { trackEvent } from '@/lib/analytics'
import { buttonClass } from '@/components/ui/styles'

export function GoogleSignInButton({
  label = 'Continuer avec Google',
  trackingEvent = 'sign_in',
}: {
  label?: string
  trackingEvent?: string
}) {
  const { signInWithGoogle } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setLoading(true)
    setError(null)
    trackEvent(trackingEvent, { method: 'google' })
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
        className={buttonClass({ variant: 'secondary', size: 'lg', fullWidth: true })}
      >
        <GoogleIcon size={18} />
        {loading ? 'Redirection…' : label}
      </button>
      {error && <p className="mt-2 text-center text-sm text-red-600">{error}</p>}
    </div>
  )
}
