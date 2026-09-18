import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Gift, Plus, TriangleAlert } from 'lucide-react'
import { listPromos, savePromo, type PromoCode, type PromoInput } from '@/services/admin.service'
import { PLANS } from '@/config/plans'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Dialog } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'

const CODE_RE = /^[a-z0-9][a-z0-9-]{2,39}$/

const inputClass =
  'mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 read-only:bg-gray-50 read-only:text-gray-500'

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
const fmtDate = (iso: string) => dateFmt.format(new Date(iso))

function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

type Status = { label: string; className: string }

function statusOf(p: PromoCode): Status {
  const now = Date.now()
  if (!p.active) return { label: 'Désactivée', className: 'bg-gray-100 text-gray-600' }
  if (p.expires_at && new Date(p.expires_at).getTime() < now)
    return { label: 'Terminée', className: 'bg-gray-100 text-gray-600' }
  if (p.max_redemptions !== null && p.redemptions >= p.max_redemptions)
    return { label: 'Épuisée', className: 'bg-amber-100 text-amber-800' }
  if (new Date(p.starts_at).getTime() > now) return { label: 'Programmée', className: 'bg-blue-100 text-blue-800' }
  return { label: 'Active', className: 'bg-emerald-100 text-emerald-800' }
}

function toInput(p: PromoCode): PromoInput {
  return {
    code: p.code,
    label: p.label,
    description: p.description,
    plan: p.plan,
    days: p.days,
    max_redemptions: p.max_redemptions,
    starts_at: p.starts_at,
    expires_at: p.expires_at,
    active: p.active,
    show_on_landing: p.show_on_landing,
  }
}

export function PromosTool() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [editing, setEditing] = useState<PromoCode | null>(null)
  const [creating, setCreating] = useState(false)

  const { data, isLoading, error } = useQuery({ queryKey: ['admin-promos'], queryFn: listPromos })

  const toggle = useMutation({
    mutationFn: (p: PromoCode) => savePromo({ ...toInput(p), active: !p.active }, false),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-promos'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl space-y-2 text-sm text-ink-700/70">
          <p>
            Une fois créée, l'offre apparaît automatiquement sur le tableau de bord et la page Facturation des
            commerçants éligibles (plan inférieur ou égal, offre pas encore utilisée). Un code ne peut être utilisé
            qu'une fois par boutique.
          </p>
          <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-amber-900">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
            Attention : une promotion offre du temps d'abonnement réel. Vérifiez la durée, le plan et la limite
            d'activations avant de l'activer.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus size={16} aria-hidden /> Nouvelle promotion
        </button>
      </div>

      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorMessage message={(error as Error).message} />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={Gift} title="Aucune promotion" description="Créez votre première offre." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {data.map((p) => {
            const st = statusOf(p)
            return (
              <li key={p.code} className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-heading font-semibold text-ink-900">{p.label}</p>
                    <p className="font-mono text-xs text-ink-700/60">{p.code}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.className}`}>{st.label}</span>
                </div>
                <p className="mt-3 text-sm font-medium text-ink-900">
                  {p.days} jours de {PLANS[p.plan].label}
                </p>
                <p className="mt-1 text-sm text-ink-700/70">
                  Du {fmtDate(p.starts_at)} {p.expires_at ? `au ${fmtDate(p.expires_at)}` : '(sans date de fin)'}
                </p>
                <p className="mt-1 text-sm text-ink-700/70">
                  {p.redemptions} activation{p.redemptions > 1 ? 's' : ''}
                  {p.max_redemptions !== null ? ` / ${p.max_redemptions}` : ''}
                </p>
                {p.show_on_landing && (
                  <span className="mt-2 inline-block rounded-full bg-sand-100 px-2.5 py-0.5 text-xs font-medium text-ink-700">
                    Visible sur la landing
                  </span>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(p)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    disabled={toggle.isPending}
                    onClick={() => toggle.mutate(p)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {p.active ? 'Désactiver' : 'Activer'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {(creating || editing) && (
        <PromoFormDialog
          key={editing?.code ?? 'new'}
          promo={editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function PromoFormDialog({ promo, onClose }: { promo: PromoCode | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const isEdit = promo !== null

  const [label, setLabel] = useState(promo?.label ?? '')
  const [code, setCode] = useState(promo?.code ?? '')
  const [description, setDescription] = useState(promo?.description ?? '')
  const [plan, setPlan] = useState<'essential' | 'pro'>(promo?.plan ?? 'essential')
  const [days, setDays] = useState(String(promo?.days ?? 30))
  const [start, setStart] = useState(toLocalInput(promo?.starts_at ?? new Date().toISOString()))
  const [end, setEnd] = useState(toLocalInput(promo?.expires_at ?? null))
  const [max, setMax] = useState(promo?.max_redemptions != null ? String(promo.max_redemptions) : '')
  const [landing, setLanding] = useState(promo?.show_on_landing ?? false)
  const [active, setActive] = useState(promo?.active ?? true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (input: PromoInput) => savePromo(input, !isEdit),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-promos'] })
      toast.success(isEdit ? 'Promotion mise à jour.' : 'Promotion créée.')
      onClose()
    },
    onError: (e: Error) => setServerError(e.message),
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)
    const errs: Record<string, string> = {}
    const trimmed = label.trim()
    if (trimmed.length < 3 || trimmed.length > 80) errs.label = 'Le titre doit faire entre 3 et 80 caractères.'
    if (!CODE_RE.test(code))
      errs.code = 'Code invalide : 3 à 40 caractères (minuscules, chiffres, tirets), sans tiret au début.'
    if (description.trim().length > 200) errs.description = 'La description ne peut pas dépasser 200 caractères.'
    const d = Number(days)
    if (!Number.isInteger(d) || d < 1 || d > 366) errs.days = 'La durée doit être un nombre entier entre 1 et 366 jours.'
    const startMs = start ? new Date(start).getTime() : NaN
    if (Number.isNaN(startMs)) errs.start = 'Date de début invalide.'
    let endMs: number | null = null
    if (end) {
      endMs = new Date(end).getTime()
      if (Number.isNaN(endMs)) errs.end = 'Date de fin invalide.'
      else if (!Number.isNaN(startMs) && endMs <= startMs) errs.end = 'La fin doit être postérieure au début.'
    }
    let maxN: number | null = null
    if (max.trim() !== '') {
      maxN = Number(max)
      if (!Number.isInteger(maxN) || maxN < 1) errs.max = "Le nombre d'activations doit être un entier supérieur à 0."
    }
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    mutation.mutate({
      code,
      label: trimmed,
      description: description.trim() || null,
      plan,
      days: d,
      max_redemptions: maxN,
      starts_at: new Date(start).toISOString(),
      expires_at: end ? new Date(end).toISOString() : null,
      active,
      show_on_landing: landing,
    })
  }

  const err = (k: string) => (errors[k] ? <p className="mt-1 text-xs text-red-600">{errors[k]}</p> : null)
  const help = (t: string) => <p className="mt-1 text-xs text-gray-500">{t}</p>

  return (
    <Dialog
      open
      onClose={mutation.isPending ? () => {} : onClose}
      title={isEdit ? 'Modifier la promotion' : 'Nouvelle promotion'}
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <label className="block text-sm font-medium text-gray-700">
          Titre
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={80}
            placeholder="1 mois Essentiel offert"
            className={inputClass}
          />
          {err('label')}
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Code
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toLowerCase())}
            readOnly={isEdit}
            maxLength={40}
            placeholder="bitiko1mois"
            className={`${inputClass} font-mono`}
          />
          {err('code')}
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Description courte (optionnelle)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
            rows={2}
            className={inputClass}
          />
          {help("Affichée sur la carte d'offre du commerçant.")}
          {err('description')}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-gray-700">
            Plan
            <select value={plan} onChange={(e) => setPlan(e.target.value as 'essential' | 'pro')} className={inputClass}>
              <option value="essential">{PLANS.essential.label}</option>
              <option value="pro">{PLANS.pro.label}</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Durée en jours
            <input
              type="number"
              min={1}
              max={366}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className={inputClass}
            />
            {err('days')}
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Début
            <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} />
            {err('start')}
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Fin
            <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className={inputClass} />
            {help('Vide = sans date de fin')}
            {err('end')}
          </label>
        </div>

        <label className="block text-sm font-medium text-gray-700">
          Nombre maximum d'activations
          <input
            type="number"
            min={1}
            value={max}
            onChange={(e) => setMax(e.target.value)}
            className={inputClass}
          />
          {help('Vide = illimité')}
          {err('max')}
        </label>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={landing} onChange={(e) => setLanding(e.target.checked)} />
            Afficher sur la page d'accueil du site
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active
          </label>
        </div>

        {serverError && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {serverError}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {mutation.isPending ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer la promotion'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
