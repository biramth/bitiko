import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { useShopRole } from '@/features/shop-settings/useShopRole'
import { useWorkspaceModules } from '@/features/workspace/useWorkspaceModules'
import { AUTOMATION_EVENTS, type AutomationEventDef } from '@/features/automations/events'
import { listAutomationRules, saveEmailRule, type AutomationRuleRow } from '@/services/automation.service'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { useToast } from '@/components/ui/Toast'
import { usePageSeo } from '@/hooks/usePageSeo'

/** Événements proposés selon le métier : commandes si la boutique vend,
 *  rendez-vous / réservations si elle en prend. Capabilities inconnues = tout. */
function eventsForCapabilities(capabilities: Set<string> | null): AutomationEventDef[] {
  if (capabilities === null) return AUTOMATION_EVENTS
  return AUTOMATION_EVENTS.filter((event) => {
    if (event.type.startsWith('ORDER_')) return capabilities.has('HAS_ORDERS')
    if (event.type === 'APPOINTMENT_CREATED') return capabilities.has('HAS_APPOINTMENTS')
    if (event.type === 'RESERVATION_CREATED') return capabilities.has('HAS_RESERVATIONS')
    return true
  })
}

const inputClass = 'mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none'

function EventRuleCard({
  shopId,
  event,
  rule,
}: {
  shopId: string
  event: AutomationEventDef
  rule: AutomationRuleRow | undefined
}) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [enabled, setEnabled] = useState(rule?.enabled ?? false)
  const [subject, setSubject] = useState(rule?.template.subject ?? event.defaultSubject)
  const [body, setBody] = useState(rule?.template.body ?? event.defaultBody)

  const saveMutation = useMutation({
    mutationFn: () => saveEmailRule({ shopId, eventType: event.type, enabled, subject, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules', shopId] })
      toast.success(enabled ? 'Notification activée.' : 'Notification enregistrée (désactivée).')
    },
    onError: () => toast.error('Enregistrement impossible.'),
  })

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900">{event.label}</h2>
          <p className="mt-0.5 text-sm text-gray-500">{event.description}</p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="accent-brand-600"
          />
          Envoyer un email
        </label>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label htmlFor={`subject-${event.type}`} className="block text-sm font-medium text-gray-700">Objet</label>
          <input
            id={`subject-${event.type}`}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={`body-${event.type}`} className="block text-sm font-medium text-gray-700">Message</label>
          <textarea
            id={`body-${event.type}`}
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-gray-500">
            Variables : {event.variables.map((variable) => `{{${variable}}}`).join(', ')}
          </p>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !subject.trim()}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </section>
  )
}

export function NotificationsPage() {
  usePageSeo({ title: 'Notifications — Bitiko', noindex: true })
  const { data: shop, isLoading: shopLoading } = useMyShop()
  const { role, isLoading: roleLoading } = useShopRole()
  const { capabilities } = useWorkspaceModules()

  const { data: rules = [], isLoading, isError } = useQuery({
    queryKey: ['automation-rules', shop?.id],
    queryFn: () => listAutomationRules(shop!.id),
    enabled: !!shop?.id,
  })

  if (shopLoading || roleLoading || isLoading) return <Spinner />
  if (!shop) return <p className="text-sm text-gray-500">Aucune boutique configurée.</p>
  if (role !== 'owner') {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
        <p className="font-heading text-lg font-bold text-gray-900">Réservé au propriétaire</p>
        <p className="text-sm text-gray-500">Seul le propriétaire de la boutique peut gérer les notifications.</p>
        <Link to="/admin" className="mt-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
          Retour au tableau de bord
        </Link>
      </div>
    )
  }
  if (isError) return <ErrorMessage />

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Recevez un email à l’adresse de votre compte quand quelque chose se passe sur votre boutique."
      />
      <div className="mt-6 space-y-4">
        {eventsForCapabilities(capabilities).map((event) => (
          <EventRuleCard
            key={`${event.type}-${rules.find((r) => r.event_type === event.type && r.channel === 'email')?.updated_at ?? 'new'}`}
            shopId={shop.id}
            event={event}
            rule={rules.find((r) => r.event_type === event.type && r.channel === 'email')}
          />
        ))}
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-xs text-gray-500">
        <Bell size={13} aria-hidden /> Les emails partent dans les instants qui suivent l’événement.
      </p>
    </div>
  )
}
