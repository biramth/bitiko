import { useEffect, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  BadgeCheck,
  BellRing,
  Copy,
  Eye,
  Mail,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  Wrench,
} from 'lucide-react'
import {
  deleteCampaign,
  listCampaigns,
  previewCampaignAudience,
  saveCampaign,
  sendCampaign,
  type CampaignAudience,
  type CampaignInput,
  type CampaignRow,
  type CampaignSendResult,
} from '@/services/platform.service'
import { Spinner } from '@/components/ui/Spinner'
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
  name: string
  subject: string
  body: string
  audience: CampaignAudience
}

const PRESETS: Preset[] = [
  {
    key: 'blank',
    label: 'Campagne vierge',
    name: '',
    subject: '',
    body: '',
    audience: { plan: 'any', logo: 'any', products: 'any', created_within_days: null },
  },
]

const SAMPLE = { shop_name: 'Awa Boutique', shop_url: 'awa.bitiko.shop', owner_name: 'Awa' }

function substitute(text: string): string {
  return text
    .replace(/\{\{\s*shop_name\s*\}\}/gi, SAMPLE.shop_name)
    .replace(/\{\{\s*shop_url\s*\}\}/gi, SAMPLE.shop_url)
    .replace(/\{\{\s*owner_name\s*\}\}/gi, SAMPLE.owner_name)
}

/** Same idea for a link target: shop_url keeps its protocol, free text is URL-encoded. */
function substituteUrl(text: string): string {
  return text
    .replace(/\{\{\s*shop_url\s*\}\}/gi, `https://${SAMPLE.shop_url}`)
    .replace(/\{\{\s*shop_name\s*\}\}/gi, encodeURIComponent(SAMPLE.shop_name))
    .replace(/\{\{\s*owner_name\s*\}\}/gi, encodeURIComponent(SAMPLE.owner_name))
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
}: {
  subject: string
  body: string
  buttonLabel: string
  buttonUrl: string
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
        <h3 className="text-center text-lg font-semibold text-gray-900">{previewSubject || '(objet)'}</h3>
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

const STATUS_LABEL: Record<CampaignRow['status'], string> = { draft: 'Brouillon', sending: 'En cours', sent: 'Envoyée' }
const STATUS_BADGE: Record<CampaignRow['status'], string> = {
  draft: 'bg-gray-100 text-gray-700',
  sending: 'bg-amber-100 text-amber-800',
  sent: 'bg-emerald-100 text-emerald-800',
}

/**
 * Transactional emails already sent automatically by the platform. Shown on
 * the marketing workspace so the operator sees what the system sends on its
 * own; per-email editing is planned but not implemented yet.
 */
const AUTOMATED_EMAILS: { key: string; icon: ReactNode; name: string; trigger: string; recipient: string }[] = [
  {
    key: 'welcome',
    icon: <Sparkles size={15} aria-hidden />,
    name: 'Email de bienvenue',
    trigger: 'À la mise en ligne d’une nouvelle boutique.',
    recipient: 'Le gérant',
  },
  {
    key: 'plan-activated',
    icon: <BadgeCheck size={15} aria-hidden />,
    name: 'Abonnement activé',
    trigger: 'Dès qu’un paiement est vérifié (Essentiel ou Pro).',
    recipient: 'Le gérant',
  },
  {
    key: 'renewal-reminder',
    icon: <BellRing size={15} aria-hidden />,
    name: 'Rappel de renouvellement',
    trigger: '2 à 3 jours avant l’échéance d’un abonnement actif.',
    recipient: 'Le gérant',
  },
]

export function CampaignsTool() {
  const queryClient = useQueryClient()
  const [view, setView] = useState<'list' | 'compose'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<CampaignAudience>(PRESETS[0].audience)
  const [buttonLabel, setButtonLabel] = useState('')
  const [buttonUrl, setButtonUrl] = useState('')
  const [sentResult, setSentResult] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const campaigns = useQuery({ queryKey: ['platform-campaigns'], queryFn: listCampaigns, retry: false })

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

  /** Clears stale mutation errors so a previous failure isn't shown in a new context. */
  const openCompose = () => {
    save.reset()
    send.reset()
    resume.reset()
    del.reset()
    setSentResult(null)
    setView('compose')
  }

  const startNew = (preset: Preset) => {
    setEditingId(null)
    setName(preset.name)
    setSubject(preset.subject)
    setBody(preset.body)
    setAudience(preset.audience)
    setButtonLabel('')
    setButtonUrl('')
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

  if (view === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => startNew(PRESETS[0])}
            className={buttonClass()}
          >
            <Plus size={16} aria-hidden /> Nouvelle campagne
          </button>
        </div>

        {sentResult && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{sentResult}</p>
        )}
        {resume.isError && <p className="text-sm text-red-600">{(resume.error as Error).message}</p>}
        {del.isError && <p className="text-sm text-red-600">{(del.error as Error).message}</p>}

        <section>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-900">Emails automatisés</h2>
            <span className="text-xs text-gray-400">Envoyés automatiquement · personnalisation à venir</span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {AUTOMATED_EMAILS.map((email) => (
              <div key={email.key} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 font-medium text-gray-900">
                    <span className="text-brand-600">{email.icon}</span>
                    {email.name}
                  </span>
                  <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                    Actif
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-500">{email.trigger}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-xs text-gray-400">Reçoit : {email.recipient}</p>
                  <button
                    type="button"
                    disabled
                    title="Personnalisation bientôt disponible."
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-400 disabled:cursor-not-allowed"
                  >
                    <Wrench size={12} aria-hidden /> Configurer
                  </button>
                </div>
              </div>
            ))}
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
                        {new Date(campaign.sent_at ?? campaign.created_at).toLocaleDateString('fr-FR')}
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
                              {(campaign.status === 'draft' || campaign.status === 'sent') && (
                                <button
                                  type="button"
                                  onClick={() => duplicate(campaign)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                                  title="Créer une copie en brouillon"
                                >
                                  <Copy size={13} aria-hidden /> Dupliquer
                                </button>
                              )}
                              {campaign.status === 'draft' && (
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

  return (
    <div className="space-y-6">
      <button type="button" onClick={() => setView('list')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={15} aria-hidden /> Retour aux campagnes
      </button>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
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
