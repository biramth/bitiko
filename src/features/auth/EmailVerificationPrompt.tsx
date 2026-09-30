import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { ExternalLink, MailCheck } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { useGuidedTour } from '@/features/guided-tour/useGuidedTour'
import { Dialog } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'
import { buttonClass } from '@/components/ui/styles'
import type { Shop } from '@/types'

const DISMISSED_KEY = 'bitiko:email-verification-dismissed'

const WEBMAILS: { match: RegExp; label: string; url: string }[] = [
  { match: /^(gmail|googlemail)\./, label: 'Ouvrir Gmail', url: 'https://mail.google.com/mail/u/0/#inbox' },
  { match: /^(outlook|hotmail|live|msn)\./, label: 'Ouvrir Outlook', url: 'https://outlook.live.com/mail/0/inbox' },
  { match: /^(yahoo|ymail)\./, label: 'Ouvrir Yahoo Mail', url: 'https://mail.yahoo.com/' },
  { match: /^(icloud|me|mac)\./, label: 'Ouvrir iCloud Mail', url: 'https://www.icloud.com/mail' },
]

function webmailFor(email: string | undefined) {
  const domain = email?.split('@')[1]?.toLowerCase() ?? ''
  return WEBMAILS.find((w) => w.match.test(domain)) ?? null
}

function wasDismissed(userId: string) {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === userId
  } catch {
    return false
  }
}

/**
 * Pop-up affichée à l'arrivée dans le dashboard tant que l'email du
 * propriétaire n'est pas confirmé : la boutique reste hors ligne (vitrine
 * « bientôt disponible », commandes publiques refusées côté base). Fermée,
 * elle revient à la prochaine session. L'état est relu au retour sur
 * l'onglet, le lien pouvant être ouvert sur un autre appareil. Attend la fin
 * de la visite guidée lancée juste après l'onboarding.
 */
export function EmailVerificationPrompt({ shop }: { shop: Shop | null | undefined }) {
  const { user, resendConfirmation, refreshEmailVerification } = useAuth()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { activeTourId } = useGuidedTour()
  const { search } = useLocation()
  const tourPending = activeTourId !== null || new URLSearchParams(search).has('tour')
  const [dismissed, setDismissed] = useState(() => !!user && wasDismissed(user.id))
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pending = !!shop && !!user && shop.owner_id === user.id && shop.owner_email_verified === false

  useEffect(() => {
    if (!pending) return
    const check = () => {
      if (document.visibilityState !== 'visible') return
      void refreshEmailVerification().then((verified) => {
        if (!verified) return
        void queryClient.invalidateQueries({ queryKey: ['my-shop'] })
        toast.success('Email confirmé : votre boutique est en ligne.')
      })
    }
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    return () => {
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [pending, refreshEmailVerification, queryClient, toast])

  if (!pending || !user) return null

  const close = () => {
    setDismissed(true)
    try {
      sessionStorage.setItem(DISMISSED_KEY, user.id)
    } catch {
      // Stockage indisponible : la pop-up reviendra au prochain chargement.
    }
  }

  const resend = async () => {
    if (!user.email) return
    setSending(true)
    setError(null)
    const { error: resendError } = await resendConfirmation(user.email)
    setSending(false)
    if (resendError) setError('Envoi impossible pour le moment. Réessayez dans une minute.')
    else setSent(true)
  }

  const webmail = webmailFor(user.email)

  return (
    <Dialog
      open={!dismissed && !tourPending}
      onClose={close}
      size="md"
      title="Confirmez votre adresse email"
      description="Votre boutique est créée, mais elle ne sera pas visible en ligne tant que votre email n’est pas confirmé."
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={close} className={buttonClass({ variant: 'secondary' })}>
            Continuer à préparer ma boutique
          </button>
          {webmail && (
            <a href={webmail.url} target="_blank" rel="noreferrer" className={buttonClass()}>
              {webmail.label} <ExternalLink size={14} aria-hidden />
            </a>
          )}
        </div>
      }
    >
      <div className="flex items-center gap-3 rounded-xl bg-brand-50 px-4 py-3">
        <MailCheck size={20} className="shrink-0 text-brand-600" aria-hidden />
        <p className="min-w-0 text-sm text-gray-700">
          Email envoyé à <strong className="break-all text-gray-900">{user.email}</strong>
        </p>
      </div>

      <ol className="mt-5 space-y-3">
        {[
          'Ouvrez votre boîte mail sur ce téléphone ou cet ordinateur.',
          'Trouvez l’email de Bitiko. Pas reçu ? Regardez dans « Spam » ou « Promotions ».',
          'Cliquez sur le lien de confirmation : votre boutique passe en ligne automatiquement.',
        ].map((step, index) => (
          <li key={step} className="flex gap-3 text-sm text-gray-700">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-900 text-xs font-bold text-white">
              {index + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>

      <p className="mt-5 rounded-lg bg-gray-50 px-3 py-2.5 text-xs text-gray-600">
        En attendant, vous pouvez tout préparer (produits, apparence, livraison). Vos visiteurs voient une page
        « bientôt disponible » et ne peuvent pas encore commander.
      </p>

      <div className="mt-4 text-sm">
        {sent ? (
          <p className="font-medium text-emerald-700">Email renvoyé — vérifiez votre boîte de réception.</p>
        ) : (
          <p className="text-gray-600">
            Rien reçu après quelques minutes ?{' '}
            <button
              type="button"
              onClick={resend}
              disabled={sending}
              className="font-medium text-brand-700 underline hover:no-underline disabled:opacity-60"
            >
              {sending ? 'Envoi…' : 'Renvoyer l’email'}
            </button>
          </p>
        )}
        {error && <p className="mt-1 text-red-600">{error}</p>}
      </div>
    </Dialog>
  )
}
