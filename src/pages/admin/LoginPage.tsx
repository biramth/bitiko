import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Lock, Mail } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/features/auth/AuthContext'
import { GoogleSignInButton } from '@/features/auth/GoogleSignInButton'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Turnstile } from '@/components/ui/Turnstile'
import { usePageSeo } from '@/hooks/usePageSeo'
import { trackEvent } from '@/lib/analytics'
import { BREACHED_PASSWORD_MESSAGE, isPasswordBreached } from '@/utils/password'
import { PlatformAwareRedirect } from '@/features/platform/PlatformAwareRedirect'
import { buttonClass } from '@/components/ui/styles'

const TURNSTILE_ENABLED = !!import.meta.env.VITE_TURNSTILE_SITE_KEY

const inputClass =
  'w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none'

type Step = 'email' | 'login' | 'signup' | 'checkEmail' | 'confirmEmail'

/**
 * Unified "email first" entry point (à la Linear/Notion): the merchant
 * types their email once, and the form reveals a password field (existing
 * account) or a signup form (new email) — instead of making them guess
 * between login and signup and hitting a dead end if they picked wrong.
 * The old standalone signup page (/inscription) is gone; every entry point
 * (marketing site, /admin/login direct link) leads here now. The existence
 * check (api/check-email.ts) never tells the merchant *why* — it just
 * decides which form to show next.
 */
export function LoginPage() {
  usePageSeo({ title: 'Connexion — Bitiko', noindex: true })
  const { session, signIn, signUp, resendConfirmation } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [checkError, setCheckError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileKey, setTurnstileKey] = useState(0)

  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [resent, setResent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  const passwordRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (step === 'login' || step === 'signup') passwordRef.current?.focus()
  }, [step])

  if (session) {
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/admin'
    return <PlatformAwareRedirect fallback={from} />
  }

  const backToEmail = () => {
    setStep('email')
    setPassword('')
    setError(null)
    setUnconfirmed(false)
    setResent(false)
    setCheckError(null)
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCheckingEmail(true)
    setCheckError(null)
    setResent(false)
    try {
      const res = await fetch('/api/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, turnstileToken }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Impossible de vérifier cet email.')
      const status = typeof body.status === 'string' ? body.status : body.exists ? 'confirmed' : 'none'
      // Unconfirmed accounts get the resend step: sending them to the login
      // form would just loop on "email not confirmed" and make them redo the
      // whole signup for an account whose row already exists.
      setStep(status === 'unconfirmed' ? 'confirmEmail' : status === 'confirmed' ? 'login' : 'signup')
    } catch (err) {
      setCheckError(err instanceof Error ? err.message : 'Impossible de vérifier cet email.')
      setTurnstileToken(null)
      setTurnstileKey((k) => k + 1) // force the widget to remount — tokens are single-use
    } finally {
      setCheckingEmail(false)
    }
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
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
        setError('Mot de passe incorrect.')
      }
      return
    }
  }

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    setLoading(true)
    setError(null)
    // Free-tier HaveIBeenPwned check (Supabase's server-side protection is
    // Pro-only) — fail-open, never blocks signup on network issues.
    if (await isPasswordBreached(password)) {
      setLoading(false)
      setError(BREACHED_PASSWORD_MESSAGE)
      return
    }
    const result = await signUp(email, password)
    setLoading(false)
    if (result.error) {
      setError(
        result.error.includes('already registered')
          ? 'Un compte existe déjà avec cet email — connecte-toi plutôt.'
          : 'Impossible de créer le compte. Réessaie.',
      )
      return
    }
    if (result.alreadyExists) {
      setResent(false)
      setStep('confirmEmail')
      return
    }
    trackEvent('sign_up', { method: 'email' })
    if (result.hasSession) {
      navigate('/admin/onboarding', { replace: true })
    } else {
      setStep('checkEmail')
    }
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

  const emailChip = (
    <button
      type="button"
      onClick={backToEmail}
      className="mb-5 flex w-full items-center gap-2 rounded-lg bg-sand-50 px-3 py-2 text-left text-sm text-gray-700 hover:bg-sand-100"
    >
      <ArrowLeft size={14} className="shrink-0 text-gray-400" aria-hidden />
      <Mail size={14} className="shrink-0 text-gray-400" aria-hidden />
      <span className="truncate">{email}</span>
      <span className="ml-auto shrink-0 text-xs font-medium text-brand-700">Modifier</span>
    </button>
  )

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-sand-50 to-white px-4">
      <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-brand-100 opacity-50 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute bottom-0 left-0 h-56 w-56 rounded-full bg-gold-300 opacity-20 blur-3xl" aria-hidden />

      <div className="relative w-full max-w-sm rounded-2xl border border-sand-200 bg-white p-8 shadow-xl shadow-ink-900/5">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <Logo size={40} withWordmark={false} />
          <h1 className="font-heading text-xl font-bold text-ink-900">Espace boutique</h1>
          <p className="text-sm text-gray-500">
            {step === 'signup' ? 'Crée ton compte pour commencer' : 'Connectez-vous pour gérer votre boutique'}
          </p>
        </div>

        <GoogleSignInButton label="Continuer avec Google" />

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-sand-200" />
          <span className="text-xs font-medium text-gray-400">ou avec votre email</span>
          <div className="h-px flex-1 bg-sand-200" />
        </div>

        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
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
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  className={inputClass}
                />
              </div>
            </div>

            <Turnstile key={turnstileKey} onVerify={setTurnstileToken} />

            {checkError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{checkError}</p>}

            <button
              type="submit"
              disabled={checkingEmail || (TURNSTILE_ENABLED && !turnstileToken)}
              className={buttonClass({ size: 'lg', fullWidth: true })}
            >
              {checkingEmail ? 'Vérification…' : 'Continuer'}
              {!checkingEmail && <ArrowRight size={15} aria-hidden />}
            </button>
          </form>
        )}

        {step === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {emailChip}
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
                <PasswordInput
                  ref={passwordRef}
                  id="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass}
                  leadingIcon={Lock}
                />
              </div>
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            {unconfirmed && (
              <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                <p>Ton email n'est pas encore confirmé.</p>
                {resent ? (
                  <p className="mt-1 font-medium">Email renvoyé — vérifie ta boîte de réception.</p>
                ) : (
                  <button type="button" onClick={handleResend} className="mt-1 font-medium underline hover:no-underline">
                    Renvoyer l'email de confirmation
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={buttonClass({ size: 'lg', fullWidth: true })}
            >
              {loading ? 'Connexion…' : 'Se connecter'}
              {!loading && <ArrowRight size={15} aria-hidden />}
            </button>
          </form>
        )}

        {step === 'signup' && (
          <form onSubmit={handleSignupSubmit} className="space-y-4">
            {emailChip}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Choisis un mot de passe
              </label>
              <div className="relative mt-1">
                <PasswordInput
                  ref={passwordRef}
                  id="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass}
                  leadingIcon={Lock}
                />
              </div>
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            <label className="flex items-start gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                required
                className="mt-0.5 accent-brand-600"
              />
              <span>
                J'accepte les{' '}
                <Link to="/legal/cgu" target="_blank" className="font-medium text-brand-700 hover:underline">
                  CGU
                </Link>{' '}
                et la{' '}
                <Link to="/legal/confidentialite" target="_blank" className="font-medium text-brand-700 hover:underline">
                  politique de confidentialité
                </Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !acceptedTerms}
              className={buttonClass({ size: 'lg', fullWidth: true })}
            >
              {loading ? 'Création…' : 'Créer mon compte'}
              {!loading && <ArrowRight size={15} aria-hidden />}
            </button>
          </form>
        )}

        {step === 'checkEmail' && (
          <div className="text-center">
            <h2 className="text-base font-semibold text-gray-900">Vérifie ton email</h2>
            <p className="mt-2 text-sm text-gray-600">
              Un email de confirmation a été envoyé à <strong>{email}</strong>. Clique sur le lien puis reviens ici
              pour créer ta boutique.
            </p>
            {resent ? (
              <p className="mt-3 text-sm font-medium text-emerald-700">Email renvoyé.</p>
            ) : (
              <button type="button" onClick={handleResend} className="mt-3 text-sm font-medium text-brand-700 underline hover:no-underline">
                Renvoyer l'email
              </button>
            )}
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>
        )}

        {step === 'confirmEmail' && (
          <div className="text-center">
            <h2 className="text-base font-semibold text-gray-900">Confirme ton email</h2>
            <p className="mt-2 text-sm text-gray-600">
              Un compte existe déjà pour <strong>{email}</strong>, mais son adresse n'est pas encore confirmée.
              Confirme-la pour te connecter.
            </p>
            {resent ? (
              <p className="mt-3 text-sm font-medium text-emerald-700">Email renvoyé — vérifie ta boîte de réception.</p>
            ) : (
              <button type="button" onClick={handleResend} className="mt-3 text-sm font-medium text-brand-700 underline hover:no-underline">
                Renvoyer l'email de confirmation
              </button>
            )}
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>
        )}

        {step === 'email' && (
          <p className="mt-6 text-center text-xs text-gray-400">
            Pas encore de boutique ? Entre ton email, on s'occupe du reste.
          </p>
        )}
      </div>
    </div>
  )
}
