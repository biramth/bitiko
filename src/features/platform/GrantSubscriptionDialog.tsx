import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { TextAreaField } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { PLANS } from '@/config/plans'
import { grantSubscription, type PlatformShop } from '@/services/platform.service'
import { formatCurrency } from '@/utils/format'

const DURATIONS = [7, 14, 30, 90]

/** Offre ou prolonge un abonnement payant à la main : geste commercial, compensation, paiement reçu hors Wave. */
export function GrantSubscriptionDialog({ shop, onClose }: { shop: PlatformShop | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [plan, setPlan] = useState<'essential' | 'pro'>('pro')
  const [days, setDays] = useState(30)
  const [reason, setReason] = useState('')

  const mutation = useMutation({
    mutationFn: () => grantSubscription({ shopId: shop!.id, plan, days, reason }),
    onSuccess: (result) => {
      toast.success(`Abonnement ${PLANS[result.plan as 'essential' | 'pro'].label} actif jusqu’au ${new Date(result.periodEnd).toLocaleDateString('fr-FR')}.`)
      queryClient.invalidateQueries({ queryKey: ['platform-shops'] })
      setReason('')
      onClose()
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Action impossible.'),
  })

  return (
    <Dialog
      open={shop !== null}
      onClose={() => { if (!mutation.isPending) onClose() }}
      title="Offrir ou prolonger un abonnement"
      description={shop ? `Boutique « ${shop.name} ». Les jours s’ajoutent à l’abonnement en cours du même plan.` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={reason.trim().length < 3}>
            Confirmer l’offre
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700">Plan</p>
          <div className="mt-1.5 flex gap-2">
            {(['essential', 'pro'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setPlan(key)}
                aria-pressed={plan === key}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${plan === key ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                {PLANS[key].label} <span className="text-xs font-normal text-gray-400">· {formatCurrency(PLANS[key].priceXof, 'XOF')}/mois</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">Durée</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {DURATIONS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setDays(value)}
                aria-pressed={days === value}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${days === value ? 'bg-ink-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {value} jours
              </button>
            ))}
          </div>
        </div>
        <TextAreaField
          label="Motif (conservé dans le journal)"
          rows={2}
          maxLength={300}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex. Geste commercial après une panne, paiement Wave reçu par WhatsApp…"
        />
      </div>
    </Dialog>
  )
}
