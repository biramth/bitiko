import { useEffect, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  BadgeCheck,
  BellRing,
  CalendarClock,
  CalendarX,
  Copy,
  Eye,
  Mail,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react'
import {
  deleteCampaign,
  getCampaignDetail,
  listAutomatedEmails,
  listCampaigns,
  previewCampaignAudience,
  saveAutomatedEmail,
  saveCampaign,
  sendCampaign,
  unscheduleCampaign,
  type AutomatedEmailKey,
  type AutomatedEmailRow,
  type CampaignAudience,
  type CampaignInput,
  type CampaignRow,
  type CampaignSendResult,
} from '@/services/platform.service'
import { Spinner } from '@/components/ui/Spinner'
import { Switch } from '@/components/ui/Switch'
import { buttonClass, controlClass } from '@/components/ui/styles'

const VARIABLES = [
  { token: '{{shop_name}}', label: 'Nom de la boutique' },
  { token: '{{shop_url}}', label: 'Lien de la boutique' },
  { token: '{{owner_name}}', label: 'Prénom du gérant' },
]

const BUTTON_LINK_VARIABLES = [
  { token: '{{shop_url}}', label: 'Lien de la boutique de chaque commerçant' },
  { token: '{{shop_name}}', label: 'Nom de la boutique' },
]

interface Preset {
  key: string
  label: string
  description: string
  name: string
  subject: string
  body: string
  audience: CampaignAudience
  buttonLabel: string
  buttonUrl: string
}

const ANY_AUDIENCE: CampaignAudience = { plan: 'any', logo: 'any', products: 'any', created_within_days: null }

const PRESETS: Preset[] = [
  {
    key: 'blank',
    label: 'Campagne vierge',
    description: 'Partir d’une page blanche, audience à choisir.',
    name: '',
    subject: '',
    body: '',
    audience: ANY_AUDIENCE,
    buttonLabel: '',
    buttonUrl: '',
  },
  {
    key: 'nouveaute',
    label: 'Annonce nouveauté',
    description: 'Présenter une fonctionnalité à tous les commerçants.',
    name: '',
    subject: 'Du nouveau pour {{shop_name}}',
    body: `Bonne nouvelle **{{owner_name}}** : [décris la nouveauté en une phrase].

Concrètement, pour {{shop_name}} :
- [bénéfice 1]
- [bénéfice 2]

Dis-moi ce que tu en penses en répondant à cet email.`,
    audience: ANY_AUDIENCE,
    buttonLabel: 'Découvrir',
    buttonUrl: '/admin',
  },
  {
    key: 'sans-produits',
    label: 'Relance sans produits',
    description: 'Boutiques en ligne sans catalogue : les aider à démarrer.',
    name: '',
    subject: '{{shop_name}} attend ses premiers produits',
    body: `Bonjour **{{owner_name}}**, ta boutique {{shop_name}} est en ligne mais n’affiche encore aucun produit — c’est l’étape qui débloque les premières commandes.

Ajoute ton premier article en quelques minutes : une photo, un prix, et c’est parti.

Besoin d’aide ? Réponds à cet email, on te guide.`,
    audience: { ...ANY_AUDIENCE, products: 'none' },
    buttonLabel: 'Ajouter mon premier produit',
    buttonUrl: '/admin/produits/nouveau',
  },
  {
    key: 'renouvellement',
    label: 'Rappel groupé',
    description: 'Relancer les abonnés payants (complète le rappel automatique).',
    name: '',
    subject: 'Pensez à renouveler {{shop_name}}',
    body: `Bonjour **{{owner_name}}**, ton abonnement sur {{shop_name}} arrive bientôt à échéance.

Renouvelle à temps pour garder tes fonctionnalités sans interruption : produits illimités, éditeur complet, sans « Propulsé par Bitiko ».`,
    audience: { ...ANY_AUDIENCE, plan: 'paid' },
    buttonLabel: 'Renouveler mon abonnement',
    buttonUrl: '/admin/parametres/compte?billing=1',
  },
]

const SAMPLE = { shop_name: 'Awa Boutique', shop_url: 'awa.bitiko.shop', owner_name: 'Awa' }
/** Exemples pour l'aperçu des variables propres aux emails automatiques. */
const SAMPLE_AUTO = { plan_name: 'Pro', period_end: '27 octobre 2026', amount: '5 000 FCFA' }

function substitute(text: string): string {
  return text
    .replace(/\{\{\s*shop_name\s*\}\}/gi, SAMPLE.shop_name)
    .replace(/\{\{\s*shop_url\s*\}\}/gi, SAMPLE.shop_url)
    .replace(/\{\{\s*owner_name\s*\}\}/gi, SAMPLE.owner_name)
    .replace(/\{\{\s*plan_name\s*\}\}/gi, SAMPLE_AUTO.plan_name)
    .replace(/\{\{\s*period_end\s*\}\}/gi, SAMPLE_AUTO.period_end)
    .replace(/\{\{\s*amount\s*\}\}/gi, SAMPLE_AUTO.amount)
}

/** Same idea for a link target: shop_url keeps its protocol, free text is URL-encoded. */
function substituteUrl(text: string): string {
  return text
    .replace(/\{\{\s*shop_url\s*\}\}/gi, `https://${SAMPLE.shop_url}`)
    .replace(/\{\{\s*shop_name\s*\}\}/gi, encodeURIComponent(SAMPLE.shop_name))
    .replace(/\{\{\s*owner_name\s*\}\}/gi, encodeURIComponent(SAMPLE.owner_name))
    .replace(/\{\{\s*plan_name\s*\}\}/gi, encodeURIComponent(SAMPLE_AUTO.plan_name))
    .replace(/\{\{\s*period_end\s*\}\}/gi, encodeURIComponent(SAMPLE_AUTO.period_end))
    .replace(/\{\{\s*amount\s*\}\}/gi, encodeURIComponent(SAMPLE_AUTO.amount))
}

/** Renders **bold** as <strong> without dangerouslySetInnerHTML. */
function renderBold(line: string): ReactNode[] {
  return line.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={index}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={index}>{part}</span>
    ),
  )
}

const DEFAULT_BUTTON_LABEL = 'Ouvrir mon tableau de bord'
const DEFAULT_BUTTON_URL = `${typeof window !== 'undefined' ? window.location.origin : 'https://bitiko.shop'}/admin`

function CampaignPreview({
  subject,
  body,
  buttonLabel,
  buttonUrl,
  heading,
}: {
  subject: string
  body: string
  buttonLabel: string
  buttonUrl: string
  /** Titre affiché à la place de l'objet (les emails auto ont leur propre titre). */
  heading?: string
}) {
  const paragraphs = substitute(body).split(/\n{2,}/)
  const previewSubject = substitute(subject)
  const previewLabel = substitute(buttonLabel).trim() || DEFAULT_BUTTON_LABEL
  const previewUrl = substituteUrl(buttonUrl).trim() || DEFAULT_BUTTON_URL
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <div className="bg-ink-900 px-6 py-4 text-center">
        <p className="font-heading text-sm font-bold text-white">Bitiko</p>
      </div>
      <div className="bg-white px-6 py-6">
        <h3 className="text-center text-lg font-semibold text-gray-900">{heading ?? (previewSubject || '(objet)')}</h3>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-gray-600">
          {paragraphs.map((para, i) => (
            <p key={i}>
              {para.split('\n').map((line, j, arr) => (
                <span key={j}>
                  {renderBold(line)}
                  {j < arr.length - 1 && <br />}
                </span>
              ))}
            </p>
          ))}
        </div>
        <div className="mt-6 text-center">
          <span className="inline-block rounded-lg bg-brand-600 px-6 py-3 text-sm font-medium text-white">
            {previewLabel} →
          </span>
          <p className="mt-1.5 break-all text-[11px] text-gray-400">{previewUrl}</p>
        </div>
      </div>
      <div className="border-t border-gray-100 bg-gray-50 px-6 py-3 text-center text-[11px] text-gray-400">
        Aperçu — rendu réel avec le nom de chaque boutique.
      </div>
    </div>
  )
}

function useDebounced<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

const PLAN_LABELS: Record<Exclude<CampaignAudience['plan'], 'any' | undefined>, string> = {
  free: 'Plan gratuit',
  paid: 'Offres payantes',
  essential: 'Essentiel',
  pro: 'Pro',
}
const LOGO_LABELS: Record<Exclude<CampaignAudience['logo'], 'any' | undefined>, string> = {
  has: 'Avec logo',
  none: 'Sans logo',
}
const PRODUCTS_LABELS: Record<Exclude<CampaignAudience['products'], 'any' | undefined>, string> = {
  has: 'Avec produits',
  none: 'Sans produit',
}

/** Human-readable summary of the effective audience filters, discarding 'any'. */
function audienceSummary(audience: CampaignAudience): string[] {
  const parts: string[] = []
  if (audience.plan && audience.plan !== 'any') parts.push(PLAN_LABELS[audience.plan])
  if (audience.logo && audience.logo !== 'any') parts.push(LOGO_LABELS[audience.logo])
  if (audience.products && audience.products !== 'any') parts.push(PRODUCTS_LABELS[audience.products])
  if (audience.created_within_days) parts.push(`Inscription < ${audience.created_within_days} j`)
  return parts
}

function formatSendResult(result: CampaignSendResult): string {
  const suffices: string[] = []
  if (result.sentThisRun > 0) suffices.push(`${result.sentThisRun} envoyé(s) lors de cet envoi`)
  if (result.alreadySent > 0) suffices.push(`${result.alreadySent} déjà reçu(s)`)
  if (result.skipped > 0) suffices.push(`${result.skipped} sans email joignable`)
  const suffix = suffices.length > 0 ? ` (${suffices.join(', ')})` : ''
  return `${result.sent} email(s) envoyé(s) sur ${result.recipientCount} destinataire(s)${suffix}.`
}

/** AAAA-MM-JJ → « 12 octobre 2026 » ; le jour choisi part le matin via le cron quotidien. */
function formatDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return day
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

const STATUS_LABEL: Record<CampaignRow['status'], string> = {
  draft: 'Brouillon',
  scheduled: 'Programmée',
  sending: 'En cours',
  sent: 'Envoyée',
}
const STATUS_BADGE: Record<CampaignRow['status'], string> = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-800',
  sending: 'bg-amber-100 text-amber-800',
  sent: 'bg-emerald-100 text-emerald-800',
}

/**
 * Emails transactionnels envoyés par la plateforme elle-même. L'objet, le
 * contenu, le bouton et l'interrupteur se règlent dans l'éditeur ci-dessous ;
 * la structure (titres, encadrés) reste dans le code pour garder un rendu
 * soigné dans toutes les boîtes mail.
 */
interface AutomatedMeta {
  icon: ReactNode
  name: string
  trigger: string
  recipient: string
  variables: { token: string; label: string }[]
  /** Titre tel qu'il part en vrai (plan et dates varient par destinataire). */
  previewHeading: string
}

const AUTOMATED_ORDER: AutomatedEmailKey[] = ['welcome', 'plan-activated', 'renewal-reminder']

const AUTOMATED_META: Record<AutomatedEmailKey, AutomatedMeta> = {
  welcome: {
    icon: <Sparkles size={15} aria-hidden />,
    name: 'Email de bienvenue',
    trigger: 'À la mise en ligne d’une nouvelle boutique.',
    recipient: 'Le gérant',
    variables: VARIABLES,
    previewHeading: `🎉 ${SAMPLE.shop_name} est en ligne !`,
  },
  'plan-activated': {
    icon: <BadgeCheck size={15} aria-hidden />,
    name: 'Abonnement activé',
    trigger: 'Dès qu’un paiement est vérifié (Essentiel ou Pro).',
    recipient: 'Le gérant',
    variables: [
      ...VARIABLES,
      { token: '{{plan_name}}', label: 'Nom de l’offre (Essentiel, Pro)' },
      { token: '{{period_end}}', label: 'Fin de période (ex. 27 octobre 2026)' },
    ],
    previewHeading: '🎉 Bienvenue dans Bitiko Pro !',
  },
  'renewal-reminder': {
    icon: <BellRing size={15} aria-hidden />,
    name: 'Rappel de renouvellement',
    trigger: '2 à 3 jours avant l’échéance d’un abonnement actif.',
    recipient: 'Le gérant',
    variables: [
      ...VARIABLES,
      { token: '{{plan_name}}', label: 'Nom de l’offre (Essentiel, Pro)' },
      { token: '{{period_end}}', label: 'Date d’échéance' },
      { token: '{{amount}}', label: 'Montant à payer (ex. 5 000 FCFA)' },
    ],
    previewHeading: 'Ton abonnement Pro expire bientôt',
  },
}

export function CampaignsTool() {
  const queryClient = useQueryClient()
  const [view, setView] = useState<'list' | 'templates' | 'compose' | 'automated' | 'detail'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<CampaignAudience>(PRESETS[0].audience)
  const [buttonLabel, setButtonLabel] = useState('')
  const [buttonUrl, setButtonUrl] = useState('')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleNote, setScheduleNote] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [sentResult, setSentResult] = useState<string | null>(null)
  const [autoResult, setAutoResult] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [editingAutoKey, setEditingAutoKey] = useState<AutomatedEmailKey | null>(null)
  const [autoEnabled, setAutoEnabled] = useState(true)
  const [autoSubject, setAutoSubject] = useState('')
  const [autoBody, setAutoBody] = useState('')
  const [autoButtonLabel, setAutoButtonLabel] = useState('')
  const [autoButtonUrl, setAutoButtonUrl] = useState('')

  const campaigns = useQuery({ queryKey: ['platform-campaigns'], queryFn: listCampaigns, retry: false })
  const automated = useQuery({ queryKey: ['platform-automated-emails'], queryFn: listAutomatedEmails, retry: false })
  const detail = useQuery({
    queryKey: ['platform-campaign-detail', detailId],
    queryFn: () => getCampaignDetail(detailId!),
    retry: false,
    enabled: view === 'detail' && !!detailId,
  })

  const debouncedAudience = useDebounced(audience)
  const preview = useQuery({
    queryKey: ['platform-campaign-audience', JSON.stringify(debouncedAudience)],
    queryFn: () => previewCampaignAudience(debouncedAudience),
    retry: false,
    enabled: view === 'compose',
  })

  const invalidateCampaigns = () => queryClient.invalidateQueries({ queryKey: ['platform-campaigns'] })

  const save = useMutation({
    mutationFn: (input: CampaignInput) => saveCampaign(input),
  })
  const send = useMutation({
    mutationFn: async () => {
      const input: CampaignInput = {
        id: editingId ?? undefined,
        name,
        subject,
        body,
        audience,
        buttonLabel: buttonLabel.trim(),
        buttonUrl: buttonUrl.trim(),
      }
      const { id } = await saveCampaign(input)
      return sendCampaign(id)
    },
    onSuccess: (result) => {
      setSentResult(formatSendResult(result))
      setView('list')
      setEditingId(null)
      invalidateCampaigns()
    },
    onError: () => {
      // The server releases its 'sending' claim on failure — refresh so the
      // list shows the campaign back as a draft.
      invalidateCampaigns()
    },
  })
  const resume = useMutation({
    mutationFn: (id: string) => sendCampaign(id),
    onSuccess: (result) => {
      setSentResult(formatSendResult(result))
      invalidateCampaigns()
    },
    onError: () => invalidateCampaigns(),
  })
  const del = useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      setPendingDelete(null)
      invalidateCampaigns()
    },
  })
  const schedule = useMutation({
    mutationFn: async (day: string) => {
      const input: CampaignInput = {
        id: editingId ?? undefined,
        name,
        subject,
        body,
        audience,
        buttonLabel: buttonLabel.trim(),
        buttonUrl: buttonUrl.trim(),
        scheduledFor: day,
      }
      return saveCampaign(input)
    },
    onSuccess: (_, day) => {
      setSentResult(`Campagne programmée pour le ${formatDay(day)} : envoi le matin par le traitement quotidien.`)
      setView('list')
      setEditingId(null)
      setScheduleDate('')
      setScheduleNote(null)
      invalidateCampaigns()
    },
  })
  const unschedule = useMutation({
    mutationFn: (id: string) => unscheduleCampaign(id),
    onSuccess: () => {
      setScheduleDate('')
      setScheduleNote('Programmation annulée : la campagne est de nouveau un brouillon.')
      invalidateCampaigns()
    },
  })
  const saveAuto = useMutation({
    mutationFn: () =>
      saveAutomatedEmail({
        key: editingAutoKey!,
        subject: autoSubject,
        body: autoBody,
        buttonLabel: autoButtonLabel.trim(),
        buttonUrl: autoButtonUrl.trim(),
        isEnabled: autoEnabled,
      }),
    onSuccess: () => {
      setAutoResult('Email automatique mis à jour : les prochains envois utilisent ce contenu.')
      setView('list')
      setEditingAutoKey(null)
      queryClient.invalidateQueries({ queryKey: ['platform-automated-emails'] })
    },
  })

  /** Clears stale mutation errors so a previous failure isn't shown in a new context. */
  const openCompose = () => {
    save.reset()
    send.reset()
    resume.reset()
    del.reset()
    schedule.reset()
    unschedule.reset()
    saveAuto.reset()
    setSentResult(null)
    setAutoResult(null)
    setScheduleNote(null)
    setView('compose')
  }

  const startNew = (preset: Preset) => {
    setEditingId(null)
    setName(preset.name)
    setSubject(preset.subject)
    setBody(preset.body)
    setAudience(preset.audience)
    setButtonLabel(preset.buttonLabel)
    setButtonUrl(preset.buttonUrl)
    setScheduleDate('')
    setScheduleNote(null)
    openCompose()
  }

  const editDraft = (campaign: CampaignRow) => {
    setEditingId(campaign.id)
    setName(campaign.name)
    setSubject(campaign.subject)
    setBody(campaign.body)
    setAudience(campaign.audience ?? {})
    setButtonLabel(campaign.button_label ?? '')
    setButtonUrl(campaign.button_url ?? '')
    setScheduleDate(campaign.scheduled_at?.slice(0, 10) ?? '')
    setScheduleNote(null)
    openCompose()
  }

  const duplicate = (campaign: CampaignRow) => {
    setEditingId(null)
    setName(`${campaign.name} (copie)`)
    setSubject(campaign.subject)
    setBody(campaign.body)
    setAudience(campaign.audience ?? {})
    setButtonLabel(campaign.button_label ?? '')
    setButtonUrl(campaign.button_url ?? '')
    openCompose()
  }

  const editAutomated = (key: AutomatedEmailKey, row: AutomatedEmailRow | undefined) => {
    saveAuto.reset()
    setAutoResult(null)
    setEditingAutoKey(key)
    setAutoEnabled(row?.is_enabled ?? true)
    setAutoSubject(row?.subject ?? '')
    setAutoBody(row?.body ?? '')
    setAutoButtonLabel(row?.button_label ?? '')
    setAutoButtonUrl(row?.button_url ?? '')
    setView('automated')
  }

  const saveDraft = () => {
    save.mutate(
      {
        id: editingId ?? undefined,
        name,
        subject,
        body,
        audience,
        buttonLabel: buttonLabel.trim(),
        buttonUrl: buttonUrl.trim(),
      },
      {
        onSuccess: ({ id }) => {
          setEditingId(id)
          invalidateCampaigns()
        },
      },
    )
  }

  const canSend = name.trim() && subject.trim() && body.trim() && (preview.data?.withEmail ?? 0) > 0
  const editingRow = editingId ? campaigns.data?.find((c) => c.id === editingId) : undefined
  const editingScheduled = editingRow?.status === 'scheduled'
  const canSchedule =
    name.trim() && subject.trim() && body.trim() && !!scheduleDate && scheduleDate >= todayISO() && !schedule.isPending

  if (view === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setView('templates')}
            className={buttonClass()}
          >
            <Plus size={16} aria-hidden /> Nouvelle campagne
          </button>
        </div>

        {sentResult && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{sentResult}</p>
        )}
        {autoResult && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{autoResult}</p>
        )}
        {resume.isError && <p className="text-sm text-red-600">{(resume.error as Error).message}</p>}
        {del.isError && <p className="text-sm text-red-600">{(del.error as Error).message}</p>}
        {unschedule.isError && <p className="text-sm text-red-600">{(unschedule.error as Error).message}</p>}

        <section>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-900">Emails automatisés</h2>
            <span className="text-xs text-gray-400">Envoyés automatiquement par la plateforme</span>
          </div>
          {automated.isError && (
            <p className="mt-3 text-sm text-red-600">Impossible de charger les emails automatiques : la migration 0138 est peut-être manquante.</p>
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {AUTOMATED_ORDER.map((key) => {
              const meta = AUTOMATED_META[key]
              const row = automated.data?.find((t) => t.key === key)
              const enabled = row?.is_enabled ?? true
              return (
                <div key={key} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 font-medium text-gray-900">
                      <span className="text-brand-600">{meta.icon}</span>
                      {meta.name}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {enabled ? 'Actif' : 'Désactivé'}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">{meta.trigger}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-xs text-gray-400">Reçoit : {meta.recipient}</p>
                    <button
                      type="button"
                      onClick={() => editAutomated(key, row)}
                      disabled={automated.isPending || automated.isError}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                    >
                      <Pencil size={12} aria-hidden /> Configurer
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-900">Campagnes manuelles</h2>
          {campaigns.isLoading && <Spinner />}
          {campaigns.isError && (
            <p className="mt-3 text-sm text-red-600">{campaigns.error instanceof Error ? campaigns.error.message : 'Erreur.'}</p>
          )}

          {campaigns.data && campaigns.data.length === 0 && (
            <div className="mt-3 rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
              <Mail size={26} className="mx-auto text-gray-300" aria-hidden />
              <p className="mt-3 text-sm text-gray-500">Aucune campagne pour l’instant.</p>
            </div>
          )}

          {campaigns.data && campaigns.data.length > 0 && (
            <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Campagne</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Audience</th>
                  <th className="px-4 py-3 font-medium">Envoyés</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {campaigns.data.map((campaign) => {
                  const audienceNote = audienceSummary(campaign.audience ?? {}).join(' · ')
                  return (
                    <tr key={campaign.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{campaign.name}</p>
                        <p className="text-xs text-gray-400">{campaign.subject}</p>
                        {audienceNote && <p className="mt-0.5 truncate text-xs text-gray-400">{audienceNote}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[campaign.status]}`}>
                          {STATUS_LABEL[campaign.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {campaign.status === 'sent' ? campaign.recipient_count : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {campaign.status === 'sent' ? (
                          <span>
                            {campaign.sent_count}
                            {campaign.failed_count > 0 && <span className="text-red-600"> · {campaign.failed_count} échec(s)</span>}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {campaign.status === 'scheduled' && campaign.scheduled_at
                          ? formatDay(campaign.scheduled_at.slice(0, 10))
                          : new Date(campaign.sent_at ?? campaign.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {pendingDelete === campaign.id ? (
                            <>
                              <span className="text-xs text-gray-500">Supprimer ?</span>
                              <button
                                type="button"
                                onClick={() => del.mutate(campaign.id)}
                                disabled={del.isPending}
                                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                              >
                                {del.isPending ? 'Suppression…' : 'Confirmer'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingDelete(null)}
                                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                              >
                                Annuler
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setDetailId(campaign.id)
                                  setView('detail')
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                                title="Destinataires et échecs d’envoi"
                              >
                                <Eye size={13} aria-hidden /> Détail
                              </button>
                              {(campaign.status === 'draft' || campaign.status === 'scheduled' || campaign.status === 'sent') && (
                                <button
                                  type="button"
                                  onClick={() => duplicate(campaign)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                                  title="Créer une copie en brouillon"
                                >
                                  <Copy size={13} aria-hidden /> Dupliquer
                                </button>
                              )}
                              {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => editDraft(campaign)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                                  >
                                    <Pencil size={13} aria-hidden /> Modifier
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPendingDelete(campaign.id)}
                                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-red-600"
                                    aria-label={`Supprimer ${campaign.name}`}
                                  >
                                    <Trash2 size={14} aria-hidden />
                                  </button>
                                </>
                              )}
                              {campaign.status === 'scheduled' && (
                                <button
                                  type="button"
                                  onClick={() => unschedule.mutate(campaign.id)}
                                  disabled={unschedule.isPending}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100 disabled:opacity-60"
                                  title="Annuler l’envoi programmé : la campagne redevient un brouillon."
                                >
                                  <CalendarX size={13} aria-hidden /> Déprogrammer
                                </button>
                              )}
                              {campaign.status === 'sending' && (
                                <button
                                  type="button"
                                  onClick={() => resume.mutate(campaign.id)}
                                  disabled={resume.isPending}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-60"
                                  title="Relance l’envoi : reprend là où il s’est arrêté (un envoi interrompu par le serveur est repris sans double-envoi)."
                                >
                                  <RotateCcw size={13} aria-hidden /> {resume.isPending ? 'Reprise…' : 'Reprendre'}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>
          )}
        </section>
      </div>
    )
  }

  const count = preview.data?.count ?? 0
  const withEmail = preview.data?.withEmail ?? 0

  if (view === 'automated' && editingAutoKey) {
    const meta = AUTOMATED_META[editingAutoKey]
    const canSaveAuto = autoSubject.trim() && autoBody.trim() && !saveAuto.isPending
    return (
      <div className="space-y-6">
        <button type="button" onClick={() => setView('list')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft size={15} aria-hidden /> Retour aux campagnes
        </button>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-gray-900">{meta.name}</h3>
              <p className="mt-1 text-xs text-gray-500">{meta.trigger} Reçoit : {meta.recipient}.</p>
              <div className="mt-3">
                <Switch checked={autoEnabled} onChange={setAutoEnabled} label={autoEnabled ? 'Email activé' : 'Email désactivé'} />
              </div>
              {!autoEnabled && (
                <p className="mt-2 text-xs text-amber-700">Désactivé : cet email ne sera plus envoyé tant que l’interrupteur est coupé.</p>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <label className="block text-xs font-medium text-gray-500">Objet de l’email</label>
              <input
                value={autoSubject}
                onChange={(e) => setAutoSubject(e.target.value)}
                maxLength={160}
                placeholder="Ce que le commerçant voit dans sa boîte mail"
                className={`${controlClass()} mt-1`}
              />
              <p className="mt-1 text-[11px] text-gray-400">
                Les variables <span className="font-mono">&#123;&#123;…&#125;&#125;</span> fonctionnent aussi dans l’objet.
              </p>
              <label className="mt-4 block text-xs font-medium text-gray-500">Contenu</label>
              <textarea
                value={autoBody}
                onChange={(e) => setAutoBody(e.target.value)}
                rows={10}
                maxLength={8000}
                placeholder="Rédige ton message…"
                className={`${controlClass()} mt-1 resize-y`}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {meta.variables.map((variable) => (
                  <button
                    key={variable.token}
                    type="button"
                    onClick={() => setAutoBody((prev) => `${prev}${variable.token}`)}
                    className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-100"
                    title={variable.label}
                  >
                    {variable.token}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-gray-400">**gras** · double saut de ligne = nouveau paragraphe.</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-gray-900">Bouton du mail</h3>
              <label className="mt-3 block text-xs font-medium text-gray-500">Texte du bouton</label>
              <input
                value={autoButtonLabel}
                onChange={(e) => setAutoButtonLabel(e.target.value)}
                maxLength={60}
                placeholder="Vide = texte par défaut"
                className={`${controlClass()} mt-1`}
              />
              <label className="mt-4 block text-xs font-medium text-gray-500">Lien du bouton</label>
              <input
                value={autoButtonUrl}
                onChange={(e) => setAutoButtonUrl(e.target.value)}
                maxLength={2048}
                placeholder="Vide = lien par défaut (/admin…)"
                className={`${controlClass()} mt-1`}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {meta.variables
                  .filter((v) => v.token === '{{shop_url}}')
                  .map((variable) => (
                    <button
                      key={variable.token}
                      type="button"
                      onClick={() => setAutoButtonUrl((prev) => `${prev}${variable.token}`)}
                      className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-100"
                      title={variable.label}
                    >
                      {variable.token}
                    </button>
                  ))}
              </div>
              <p className="mt-1 text-[11px] text-gray-400">Commence par / ou https:// — vide = lien par défaut.</p>
            </div>

            {saveAuto.isError && <p className="text-sm text-red-600">{(saveAuto.error as Error).message}</p>}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => saveAuto.mutate()}
                disabled={!canSaveAuto}
                className={buttonClass()}
              >
                {saveAuto.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
            <p className="text-xs text-gray-400">
              Les prochains envois automatiques utilisent ce contenu ; les emails déjà partis ne changent pas.
            </p>
          </div>

          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Eye size={16} aria-hidden /> Aperçu
            </h3>
            <CampaignPreview
              subject={autoSubject}
              body={autoBody}
              buttonLabel={autoButtonLabel}
              buttonUrl={autoButtonUrl}
              heading={meta.previewHeading}
            />
          </div>
        </div>
      </div>
    )
  }

  if (view === 'templates') {
    return (
      <div className="space-y-6">
        <button type="button" onClick={() => setView('list')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft size={15} aria-hidden /> Retour aux campagnes
        </button>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Choisir un point de départ</h2>
          <p className="mt-1 text-xs text-gray-500">Chaque modèle pré-remplit l’objet, le contenu, le bouton et l’audience — tout reste modifiable ensuite.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {PRESETS.map((preset) => (
            <div key={preset.key} className="flex flex-col rounded-xl border border-gray-200 bg-white p-5">
              <p className="font-medium text-gray-900">{preset.label}</p>
              <p className="mt-1 flex-1 text-xs text-gray-500">{preset.description}</p>
              {preset.subject && <p className="mt-2 truncate text-xs text-gray-400">Objet : {preset.subject}</p>}
              <button type="button" onClick={() => startNew(preset)} className={`${buttonClass()} mt-4 self-start`}>
                Utiliser ce modèle
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (view === 'detail' && detailId) {
    const detailCampaign = detail.data?.campaign ?? campaigns.data?.find((c) => c.id === detailId)
    const sends = detail.data?.sends ?? []
    const sentCount = sends.filter((s) => s.status === 'sent').length
    const failedCount = sends.filter((s) => s.status === 'failed').length
    return (
      <div className="space-y-6">
        <button type="button" onClick={() => setView('list')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft size={15} aria-hidden /> Retour aux campagnes
        </button>
        {detailCampaign && (
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-medium text-gray-900">{detailCampaign.name}</h2>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[detailCampaign.status]}`}>
                {STATUS_LABEL[detailCampaign.status]}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-400">{detailCampaign.subject}</p>
            <p className="mt-2 text-sm text-gray-600">
              {sentCount} envoyé(s){failedCount > 0 && <span className="text-red-600"> · {failedCount} échec(s)</span>}
              {sends.length === 0 && !detail.isPending && ' · aucun envoi pour l’instant'}
            </p>
          </div>
        )}
        {detail.isPending && <Spinner />}
        {detail.isError && (
          <p className="text-sm text-red-600">{detail.error instanceof Error ? detail.error.message : 'Erreur.'}</p>
        )}
        {detail.data && sends.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-100 text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Boutique</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sends.map((sendRow, index) => (
                    <tr key={`${sendRow.email}-${index}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">{sendRow.shop_name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{sendRow.email}</td>
                      <td className="px-4 py-3">
                        {sendRow.status === 'sent' ? (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                            Envoyé
                          </span>
                        ) : (
                          <span className="inline-flex flex-col gap-1">
                            <span className="inline-flex w-fit rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                              Échec
                            </span>
                            {sendRow.error && <span className="max-w-xs text-xs text-red-600">{sendRow.error}</span>}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(sendRow.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <button type="button" onClick={() => setView('list')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={15} aria-hidden /> Retour aux campagnes
      </button>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {editingScheduled && scheduleDate && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Envoi programmé pour le <strong>{formatDay(scheduleDate)}</strong>. Modifier le contenu ou l’audience conserve la programmation.
            </div>
          )}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <label className="block text-xs font-medium text-gray-500">Nom interne</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="Ex. Annonce ambiance"
              className={`${controlClass()} mt-1`}
            />
            <label className="mt-4 block text-xs font-medium text-gray-500">Objet de l’email</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={160}
              placeholder="Ce que le commerçant voit dans sa boîte mail"
              className={`${controlClass()} mt-1`}
            />
            <p className="mt-1 text-[11px] text-gray-400">
              Les variables <span className="font-mono">&#123;&#123;…&#125;&#125;</span> fonctionnent aussi dans l’objet.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-500">Contenu</label>
              <span className="text-[11px] text-gray-400">
                **gras** · double saut de ligne = nouveau paragraphe
              </span>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              maxLength={8000}
              placeholder="Rédige ton message…"
              className={`${controlClass()} mt-1 resize-y`}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {VARIABLES.map((variable) => (
                <button
                  key={variable.token}
                  type="button"
                  onClick={() => setBody((prev) => `${prev}${variable.token}`)}
                  className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-100"
                  title={variable.label}
                >
                  {variable.token}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-900">Bouton du mail</h3>
            <p className="mt-1 text-xs text-gray-500">
              Le bouton final qui invite chaque commerçant à l’action. Vide = tableau de bord.
            </p>
            <label className="mt-3 block text-xs font-medium text-gray-500">Texte du bouton</label>
            <input
              value={buttonLabel}
              onChange={(e) => setButtonLabel(e.target.value)}
              maxLength={60}
              placeholder="Ouvrir mon tableau de bord"
              className={`${controlClass()} mt-1`}
            />
            <label className="mt-4 block text-xs font-medium text-gray-500">Lien du bouton</label>
            <input
              value={buttonUrl}
              onChange={(e) => setButtonUrl(e.target.value)}
              maxLength={2048}
              placeholder="Ex. /admin, {{shop_url}}/nouveautes"
              className={`${controlClass()} mt-1`}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {BUTTON_LINK_VARIABLES.map((variable) => (
                <button
                  key={variable.token}
                  type="button"
                  onClick={() => setButtonUrl((prev) => `${prev}${variable.token}`)}
                  className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-100"
                  title={variable.label}
                >
                  {variable.token}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-900">Audience</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Offre">
                <select value={audience.plan ?? 'any'} onChange={(e) => setAudience({ ...audience, plan: e.target.value as CampaignAudience['plan'] })} className={selectClass}>
                  <option value="any">Toutes</option>
                  <option value="free">Plan gratuit</option>
                  <option value="paid">Offres payantes</option>
                  <option value="essential">Essentiel</option>
                  <option value="pro">Pro</option>
                </select>
              </Field>
              <Field label="Logo">
                <select value={audience.logo ?? 'any'} onChange={(e) => setAudience({ ...audience, logo: e.target.value as CampaignAudience['logo'] })} className={selectClass}>
                  <option value="any">Tous</option>
                  <option value="has">Avec logo</option>
                  <option value="none">Sans logo</option>
                </select>
              </Field>
              <Field label="Produits">
                <select value={audience.products ?? 'any'} onChange={(e) => setAudience({ ...audience, products: e.target.value as CampaignAudience['products'] })} className={selectClass}>
                  <option value="any">Tous</option>
                  <option value="has">Avec produits</option>
                  <option value="none">Sans produit</option>
                </select>
              </Field>
              <Field label="Inscription">
                <select
                  value={audience.created_within_days ?? ''}
                  onChange={(e) => setAudience({ ...audience, created_within_days: e.target.value ? Number(e.target.value) : null })}
                  className={selectClass}
                >
                  <option value="">Toutes</option>
                  <option value="7">7 derniers jours</option>
                  <option value="30">30 derniers jours</option>
                  <option value="90">90 derniers jours</option>
                </select>
              </Field>
            </div>

            {audienceSummary(audience).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {audienceSummary(audience).map((part) => (
                  <span key={part} className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-[11px] font-medium text-brand-700">
                    {part}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm">
              {preview.isLoading ? (
                <span className="text-gray-500">Calcul de l’audience…</span>
              ) : preview.isError ? (
                <span className="text-red-600">Impossible de calculer l’audience.</span>
              ) : (
                <span className="text-gray-700">
                  <strong className="text-gray-900">{withEmail}</strong> destinataire(s) joignable(s)
                  {count !== withEmail && <span className="text-gray-400"> sur {count} boutique(s)</span>}
                </span>
              )}
              {preview.data && preview.data.sample.length > 0 && (
                <p className="mt-1 truncate text-xs text-gray-400">
                  {preview.data.sample.map((s) => s.name).join(' · ')}
                </p>
              )}
            </div>
          </div>

          {save.isError && <p className="text-sm text-red-600">{(save.error as Error).message}</p>}
          {send.isError && <p className="text-sm text-red-600">{(send.error as Error).message}</p>}

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <CalendarClock size={15} aria-hidden /> Programmer l’envoi
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              La campagne part le matin du jour choisi, via le traitement quotidien — sans rester connecté.
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-500">Jour d’envoi</label>
                <input
                  type="date"
                  value={scheduleDate}
                  min={todayISO()}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className={`${controlClass()} mt-1`}
                />
              </div>
              <button
                type="button"
                onClick={() => schedule.mutate(scheduleDate)}
                disabled={!canSchedule}
                title={
                  !name.trim() || !subject.trim() || !body.trim()
                    ? 'Renseigne le nom, l’objet et le contenu.'
                    : !scheduleDate || scheduleDate < todayISO()
                      ? 'Choisis un jour d’envoi à venir.'
                      : undefined
                }
                className={buttonClass()}
              >
                <CalendarClock size={15} aria-hidden /> {schedule.isPending ? 'Programmation…' : editingScheduled ? 'Reprogrammer' : 'Programmer'}
              </button>
              {editingScheduled && (
                <button
                  type="button"
                  onClick={() => editingId && unschedule.mutate(editingId)}
                  disabled={unschedule.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  <CalendarX size={15} aria-hidden /> {unschedule.isPending ? 'Annulation…' : 'Annuler la programmation'}
                </button>
              )}
            </div>
            {scheduleNote && <p className="mt-2 text-xs font-medium text-emerald-700">{scheduleNote}</p>}
            {schedule.isError && <p className="mt-2 text-sm text-red-600">{(schedule.error as Error).message}</p>}
            {unschedule.isError && <p className="mt-2 text-sm text-red-600">{(unschedule.error as Error).message}</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveDraft}
              disabled={save.isPending || send.isPending || !name.trim() || !subject.trim() || !body.trim()}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              {save.isPending ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Enregistrer le brouillon'}
            </button>
            <button
              type="button"
              onClick={() => send.mutate()}
              disabled={send.isPending || !canSend}
              title={
                !name.trim() || !subject.trim() || !body.trim()
                  ? 'Renseigne le nom, l’objet et le contenu.'
                  : (preview.data?.withEmail ?? 0) === 0
                    ? 'Aucun destinataire joignable pour cette audience.'
                    : undefined
              }
              className={buttonClass()}
            >
              <Send size={15} aria-hidden /> {send.isPending ? 'Envoi…' : 'Envoyer la campagne'}
            </button>
          </div>
          <p className="text-xs text-gray-400">
            L’envoi est définitif : la campagne passe en « Envoyée » et ne peut plus être renvoyée depuis cet outil.
          </p>
        </div>

        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Eye size={16} aria-hidden /> Aperçu
          </h3>
          <CampaignPreview subject={subject} body={body} buttonLabel={buttonLabel} buttonUrl={buttonUrl} />
        </div>
      </div>
    </div>
  )
}

const selectClass =
  'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500">{label}</label>
      {children}
    </div>
  )
}
