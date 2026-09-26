import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, ChevronDown, Mail } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { useShopRole } from '@/features/shop-settings/useShopRole'
import { useWorkspaceModules } from '@/features/workspace/useWorkspaceModules'
import { AUTOMATION_EVENTS, renderPreview, type AutomationEventDef } from '@/features/automations/events'
import { listAutomationRules, saveEmailRule, type AutomationRuleRow } from '@/services/automation.service'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Switch } from '@/components/ui/Switch'
import { TextAreaField, TextField } from '@/components/ui/Field'
import { usePageSeo } from '@/hooks/usePageSeo'

/** Événements personnalisables : les commandes, si la boutique vend. Les demandes de
 *  rendez-vous et de réservation partent déjà d'office par email (voir l'encadré) :
 *  les proposer aussi ici enverrait deux emails pour la même demande. */
function eventsForCapabilities(capabilities: Set<string> | null): AutomationEventDef[] {
  return AUTOMATION_EVENTS.filter((event) => {
    if (event.type.startsWith('ORDER_')) return capabilities === null || capabilities.has('HAS_ORDERS')
    if (event.type.startsWith('STOCK_')) return capabilities === null || capabilities.has('HAS_PRODUCTS')
    return false
  })
}

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
  const [enabled, setEnabled] = useState(rule?.enabled ?? event.defaultEnabled ?? false)
  const [subject, setSubject] = useState(rule?.template.subject ?? event.defaultSubject)
  const [body, setBody] = useState(rule?.template.body ?? event.defaultBody)
  const [editing, setEditing] = useState(false)

  const dirty =
    subject !== (rule?.template.subject ?? event.defaultSubject) || body !== (rule?.template.body ?? event.defaultBody)

  const saveMutation = useMutation({
    mutationFn: (next: { enabled: boolean }) =>
      saveEmailRule({ shopId, eventType: event.type, enabled: next.enabled, subject, body }),
    onSuccess: (_d, next) => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules', shopId] })
      toast.success(next.enabled ? 'C’est activé : vous recevrez un email.' : 'Notification désactivée : vous ne recevrez plus cet email.')
    },
    onError: () => toast.error('Enregistrement impossible.'),
  })

  const toggle = (next: boolean) => {
    setEnabled(next)
    saveMutation.mutate({ enabled: next })
  }

  const insertVariable = (variable: string) => setBody((current) => `${current}${current && !current.endsWith(' ') ? ' ' : ''}{{${variable}}}`)

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 font-semibold text-gray-900">
            {event.label}
            {enabled ? <Badge tone="success">Activée</Badge> : <Badge>Désactivée</Badge>}
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">{event.description}</p>
        </div>
        <Switch checked={enabled} label="Me prévenir" disabled={saveMutation.isPending} onChange={toggle} />
      </div>

      <button
        type="button"
        onClick={() => setEditing((v) => !v)}
        aria-expanded={editing}
        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800"
      >
        {editing ? 'Fermer' : 'Voir et modifier le message'}
        <ChevronDown size={14} aria-hidden className={`transition-transform ${editing ? 'rotate-180' : ''}`} />
      </button>

      {editing && (
        <div className="mt-3 space-y-4 rounded-lg bg-gray-50 p-4">
          <TextField label="Titre de l’email" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
          <div>
            <TextAreaField label="Message" rows={3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} />
            <p className="mt-2 text-xs text-gray-500">Cliquez pour ajouter une information du client ou de la commande :</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {event.variables.map((variable) => (
                <button
                  key={variable}
                  type="button"
                  onClick={() => insertVariable(variable)}
                  className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
                >
                  + {event.variableLabels[variable] ?? variable}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
              <Mail size={12} aria-hidden /> Exemple d’email reçu
            </p>
            <p className="mt-1.5 text-sm font-semibold text-gray-900">{renderPreview(subject, event.sample) || '—'}</p>
            <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{renderPreview(body, event.sample) || '—'}</p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => saveMutation.mutate({ enabled })}
              loading={saveMutation.isPending}
              disabled={!dirty || !subject.trim()}
            >
              Enregistrer le message
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

export function NotificationsPage() {
  usePageSeo({ title: 'Notifications — Bitiko', noindex: true })
  const { user } = useAuth()
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

  const rulesFor = (type: string) => rules.find((r) => r.event_type === type && r.channel === 'email')

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={`Ne ratez plus une vente : vous êtes prévenu par email${user?.email ? ` à l’adresse ${user.email}` : ''} dès qu’il se passe quelque chose. Désactivez ce qui ne vous sert pas.`}
      />
      {(capabilities === null || capabilities.has('HAS_APPOINTMENTS') || capabilities.has('HAS_RESERVATIONS')) && (
        <Card className="mt-6 border-emerald-200 bg-emerald-50">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
            <Mail size={15} aria-hidden /> Rendez-vous et réservations : déjà activé
          </p>
          <p className="mt-1 text-sm text-emerald-800">
            Dès qu’un client demande un rendez-vous ou une table sur votre site, vous recevez automatiquement un email avec son nom, son numéro et l’horaire choisi.
          </p>
        </Card>
      )}
      <div className="mt-6 space-y-4">
        {eventsForCapabilities(capabilities).map((event) => (
          <EventRuleCard
            key={`${event.type}-${rulesFor(event.type)?.updated_at ?? 'new'}`}
            shopId={shop.id}
            event={event}
            rule={rulesFor(event.type)}
          />
        ))}
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-xs text-gray-500">
        <Bell size={13} aria-hidden /> Les emails partent dans les instants qui suivent l’événement.
      </p>
    </div>
  )
}
