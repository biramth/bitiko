import { useState } from 'react'
import { BellRing, Share, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { sendTestPush } from '@/lib/webPush'
import { usePushNotifications } from './usePushNotifications'

const PROMPT_DISMISSED_KEY = 'bitiko-push-prompt-dismissed-at'
const PROMPT_SNOOZE_MS = 7 * 24 * 3600 * 1000

function promptSnoozed(): boolean {
  try {
    const at = Number(localStorage.getItem(PROMPT_DISMISSED_KEY))
    return Number.isFinite(at) && at > 0 && Date.now() - at < PROMPT_SNOOZE_MS
  } catch {
    return false
  }
}

function IosInstallSteps() {
  return (
    <>
      Sur iPhone, ajoutez d’abord Bitiko à l’écran d’accueil : touchez <Share size={13} className="inline align-[-2px]" aria-label="Partager" />{' '}
      puis « Sur l’écran d’accueil », et ouvrez Bitiko depuis cette icône.
    </>
  )
}

/** Bandeau de l'admin : invite à activer les alertes sur l'appareil, une fois par semaine au plus. */
export function PushPromptBanner() {
  const { state, enable } = usePushNotifications()
  const toast = useToast()
  const [hidden, setHidden] = useState(promptSnoozed)
  const [busy, setBusy] = useState(false)

  if (hidden || (state !== 'off' && state !== 'needs-install')) return null

  const dismiss = () => {
    setHidden(true)
    try {
      localStorage.setItem(PROMPT_DISMISSED_KEY, String(Date.now()))
    } catch {
      // Stockage indisponible : le bandeau reviendra au prochain chargement.
    }
  }

  const activate = async () => {
    setBusy(true)
    try {
      const next = await enable()
      if (next === 'on') toast.success('C’est activé : vous serez prévenu sur cet appareil.')
      else if (next === 'denied') toast.error('Notifications bloquées : autorisez-les dans les réglages du navigateur.')
    } catch {
      toast.error('Activation impossible. Réessayez dans un instant.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
      <BellRing size={18} className="mt-0.5 shrink-0 text-brand-600" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink-900">Ne ratez plus une commande</p>
        <p className="mt-0.5 text-xs text-ink-900/70">
          {state === 'needs-install' ? (
            <IosInstallSteps />
          ) : (
            'Recevez une notification sur cet appareil dès qu’un client commande ou demande un rendez-vous, même quand Bitiko est fermé.'
          )}
        </p>
        {state === 'off' && (
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" onClick={activate} loading={busy}>
              Activer les notifications
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>
              Plus tard
            </Button>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Masquer"
        className="shrink-0 rounded-md p-1 text-ink-900/40 transition-colors hover:bg-white hover:text-ink-900"
      >
        <X size={15} aria-hidden />
      </button>
    </div>
  )
}

/** Page Notifications : état et réglage du push sur l'appareil en cours. */
export function PushDeviceCard() {
  const { state, enable, disable } = usePushNotifications()
  const toast = useToast()
  const [busy, setBusy] = useState<'enable' | 'disable' | 'test' | null>(null)

  if (state === null || state === 'unconfigured') return null

  const run = async (action: 'enable' | 'disable' | 'test') => {
    setBusy(action)
    try {
      if (action === 'enable') {
        const next = await enable()
        if (next === 'on') toast.success('C’est activé : vous serez prévenu sur cet appareil.')
      } else if (action === 'disable') {
        await disable()
        toast.success('Notifications désactivées sur cet appareil.')
      } else {
        await sendTestPush()
        toast.success('Notification de test envoyée.')
      }
    } catch (err) {
      toast.error(err instanceof Error && action === 'test' ? err.message : 'Action impossible. Réessayez dans un instant.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card className="mt-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 font-semibold text-gray-900">
            <BellRing size={16} className="text-brand-600" aria-hidden />
            Notifications sur cet appareil
            {state === 'on' ? <Badge tone="success">Activées</Badge> : <Badge>Désactivées</Badge>}
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {state === 'on' && 'Nouvelles commandes, demandes de rendez-vous et réservations arrivent ici comme un message, même Bitiko fermé.'}
            {state === 'off' && 'Gratuit et instantané : activez-les sur chaque téléphone ou ordinateur où vous suivez vos ventes.'}
            {state === 'denied' &&
              'Vous avez bloqué les notifications pour Bitiko. Autorisez-les dans les réglages du navigateur (icône à gauche de l’adresse), puis rechargez la page.'}
            {state === 'needs-install' && <IosInstallSteps />}
            {state === 'unsupported' && 'Ce navigateur ne gère pas les notifications. Utilisez Chrome sur Android ou un ordinateur.'}
          </p>
        </div>
      </div>
      {(state === 'on' || state === 'off') && (
        <div className="mt-3 flex flex-wrap gap-2">
          {state === 'off' ? (
            <Button size="sm" onClick={() => run('enable')} loading={busy === 'enable'}>
              Activer sur cet appareil
            </Button>
          ) : (
            <>
              <Button size="sm" variant="secondary" onClick={() => run('test')} loading={busy === 'test'}>
                Envoyer un test
              </Button>
              <Button size="sm" variant="ghost" onClick={() => run('disable')} loading={busy === 'disable'}>
                Désactiver sur cet appareil
              </Button>
            </>
          )}
        </div>
      )}
    </Card>
  )
}
