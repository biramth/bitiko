import { useEffect, useRef, useState } from 'react'
import { Check, ExternalLink, Loader2, MailCheck } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { CONTACT_EMAIL } from '@/config/contact'
import { buttonClass } from '@/components/ui/styles'

const RESEND_COOLDOWN_S = 60
const POLL_INTERVAL_MS = 15_000
const POLL_DURATION_MS = 15 * 60_000

const WEBMAILS: { match: RegExp; label: string; url: string }[] = [
  { match: /^(gmail|googlemail)\./, label: 'Ouvrir Gmail', url: 'https://mail.google.com/mail/u/0/#inbox' },
  { match: /^(outlook|hotmail|live|msn)\./, label: 'Ouvrir Outlook', url: 'https://outlook.live.com/mail/0/inbox' },
  { match: /^(yahoo|ymail)\./, label: 'Ouvrir Yahoo Mail', url: 'https://mail.yahoo.com/' },
  { match: /^(icloud|me|mac)\./, label: 'Ouvrir iCloud Mail', url: 'https://www.icloud.com/mail' },
]

function webmailFor(email: string) {
  const domain = email.split('@')[1]?.toLowerCase() ?? ''
  return WEBMAILS.find((w) => w.match.test(domain)) ?? null
}

const STEPS = ['Compte créé', 'Email confirmé', 'Boutique créée']

/**
 * Attente de la confirmation d'email, pensée pour ne jamais ressembler à un
 * cul-de-sac : étapes concrètes, accès direct à la messagerie, renvoi avec
 * compte à rebours, et — quand le mot de passe vient d'être saisi — détection
 * automatique : la connexion est retentée en arrière-plan (au retour sur
 * l'onglet et toutes les 15 s, pendant 15 min), donc la page avance seule
 * dès que le lien est cliqué, même sur un autre appareil.
 */
export function EmailVerificationStep({
  email,
  password,
  justSent,
  onChangeEmail,
  onLogin,
}: {
  email: string
  /** Mot de passe saisi dans cette visite : active la détection automatique. */
  password: string | null
  /** L'email vient de partir (inscription) : le renvoi démarre en compte à rebours. */
  justSent: boolean
  onChangeEmail: () => void
  onLogin: () => void
}) {
  const { signIn, resendConfirmation } = useAuth()
  const [cooldown, setCooldown] = useState(justSent ? RESEND_COOLDOWN_S : 0)
  const [sending, setSending] = useState(false)
  const [resent, setResent] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)
  const [watching, setWatching] = useState(!!password)
  const checkingRef = useRef(false)
  const signInRef = useRef(signIn)
  useEffect(() => {
    signInRef.current = signIn
  })

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  useEffect(() => {
    if (!password || !watching) return
    const startedAt = Date.now()
    const check = async () => {
      if (checkingRef.current || document.visibilityState !== 'visible') return
      if (Date.now() - startedAt > POLL_DURATION_MS) {
        setWatching(false)
        return
      }
      checkingRef.current = true
      const { error } = await signInRef.current(email, password)
      checkingRef.current = false
      // Succès : la session bascule et la page de connexion redirige d'elle-même.
      if (error && !error.toLowerCase().includes('email not confirmed')) setWatching(false)
    }
    const interval = window.setInterval(check, POLL_INTERVAL_MS)
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [email, password, watching])

  const resend = async () => {
    setSending(true)
    setResendError(null)
    const { error } = await resendConfirmation(email)
    setSending(false)
    if (error) {
      setResendError('Envoi impossible pour le moment. Réessaie dans une minute.')
      return
    }
    setResent(true)
    setCooldown(RESEND_COOLDOWN_S)
  }

  const webmail = webmailFor(email)

  return (
    <div>
      <ol className="mb-6 flex items-center gap-2" aria-label="Progression">
        {STEPS.map((label, index) => (
          <li key={label} className="flex flex-1 flex-col items-center gap-1.5 text-center">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                index === 0
                  ? 'bg-emerald-500 text-white'
                  : index === 1
                    ? 'bg-brand-600 text-white ring-4 ring-brand-100'
                    : 'bg-sand-100 text-gray-400'
              }`}
              aria-current={index === 1 ? 'step' : undefined}
            >
              {index === 0 ? <Check size={14} aria-hidden /> : index + 1}
            </span>
            <span className={`text-[11px] font-medium ${index === 1 ? 'text-ink-900' : 'text-gray-400'}`}>{label}</span>
          </li>
        ))}
      </ol>

      <div className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
          <MailCheck size={22} className="text-brand-600" aria-hidden />
        </span>
        <h2 className="mt-3 text-base font-semibold text-gray-900">Plus qu’une étape : confirme ton email</h2>
        <p className="mt-1 text-sm text-gray-600">
          Lien envoyé à <strong className="break-all text-gray-900">{email}</strong>
        </p>
        <button type="button" onClick={onChangeEmail} className="mt-0.5 text-xs font-medium text-brand-700 hover:underline">
          Ce n’est pas la bonne adresse ?
        </button>
      </div>

      <ol className="mt-5 space-y-2.5 rounded-xl bg-sand-50 p-4 text-sm text-gray-700">
        {[
          'Ouvre ta boîte mail, sur ce téléphone ou sur un autre appareil.',
          'Cherche l’email de Bitiko. Pas là ? Regarde dans « Spam » ou « Promotions ».',
          'Clique sur le lien de confirmation qu’il contient.',
        ].map((text, index) => (
          <li key={text} className="flex gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-900 text-[11px] font-bold text-white">
              {index + 1}
            </span>
            <span>{text}</span>
          </li>
        ))}
      </ol>

      {webmail && (
        <a
          href={webmail.url}
          target="_blank"
          rel="noreferrer"
          className={buttonClass({ size: 'lg', fullWidth: true, className: 'mt-4' })}
        >
          {webmail.label} <ExternalLink size={14} aria-hidden />
        </a>
      )}

      {password && watching ? (
        <p className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500" role="status">
          <Loader2 size={13} className="animate-spin" aria-hidden />
          Cette page avance toute seule dès que c’est confirmé.
        </p>
      ) : (
        <button
          type="button"
          onClick={onLogin}
          className={buttonClass({ variant: webmail ? 'secondary' : 'primary', size: 'lg', fullWidth: true, className: 'mt-3' })}
        >
          J’ai confirmé, me connecter
        </button>
      )}

      <div className="mt-5 border-t border-sand-200 pt-4 text-center text-sm text-gray-600">
        {resent && cooldown > 0 ? (
          <p className="font-medium text-emerald-700">Nouvel email envoyé. Pense à regarder dans les spams.</p>
        ) : (
          <p>
            Rien reçu ?{' '}
            {cooldown > 0 ? (
              <span className="text-gray-400">Renvoyer dans {cooldown} s</span>
            ) : (
              <button
                type="button"
                onClick={resend}
                disabled={sending}
                className="font-medium text-brand-700 underline hover:no-underline disabled:opacity-60"
              >
                {sending ? 'Envoi…' : 'Renvoyer l’email'}
              </button>
            )}
          </p>
        )}
        {resendError && <p className="mt-1 text-red-600">{resendError}</p>}
        <p className="mt-2 text-xs text-gray-400">
          Toujours bloqué ?{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-gray-500 underline hover:no-underline">
            Écris-nous
          </a>
          , on t’aide.
        </p>
      </div>
    </div>
  )
}
