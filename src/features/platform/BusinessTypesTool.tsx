import { useEffect, useMemo, useState } from 'react'
import { Briefcase } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  listBusinessCatalog,
  saveBusinessType,
  saveBusinessTypeCapabilities,
  type AdminBusinessType,
  type BusinessCatalog,
} from '@/services/admin.service'
import {
  groupCapabilitiesByCategory,
  type Capability,
} from '@/services/businessType.service'
import { buttonClass } from '@/components/ui/styles'

const STATUSES = ['active', 'deprecated', 'draft'] as const

const STATUS_LABEL: Record<string, string> = {
  active: 'Actif',
  deprecated: 'Déprécié',
  draft: 'Brouillon',
}

const inputClass =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none'

/** Platform configuration of business types + capabilities (PHASE-05).
 *  Owner/admin only — enforced server-side. Slugs are immutable once created;
 *  types retire via status, never by delete (shops may point at them). */
export function BusinessTypesTool() {
  const toast = useToast()
  const [catalog, setCatalog] = useState<BusinessCatalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({ slug: '', name: '', description: '', icon: '', status: 'active' })
  const [checked, setChecked] = useState<string[]>([])

  const reload = async () => {
    setLoading(true)
    try {
      setCatalog(await listBusinessCatalog())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selected: AdminBusinessType | null =
    catalog?.types.find((t) => t.id === selectedId) ?? null

  useEffect(() => {
    if (!selected || !catalog) return
    setForm({
      slug: selected.slug,
      name: selected.name,
      description: selected.description ?? '',
      icon: selected.icon ?? '',
      status: selected.status,
    })
    const capById = new Map(catalog.capabilities.map((c) => [c.id, c.code]))
    setChecked(
      catalog.mappings
        .filter((m) => m.business_type_id === selected.id)
        .map((m) => capById.get(m.capability_id))
        .filter((c): c is string => !!c),
    )
  }, [selectedId, catalog]) // eslint-disable-line react-hooks/exhaustive-deps

  const groups = useMemo(
    () => groupCapabilitiesByCategory((catalog?.capabilities ?? []) as Capability[]),
    [catalog],
  )

  const toggleCode = (code: string) =>
    setChecked((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]))

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Le nom est requis.')
      return
    }
    setSaving(true)
    try {
      if (creating) {
        await saveBusinessType({ ...form, create: true })
        toast.success('Type d’activité créé.')
        setCreating(false)
      } else if (selected) {
        await saveBusinessType({ id: selected.id, ...form, create: false })
        await saveBusinessTypeCapabilities(selected.id, checked)
        toast.success('Type d’activité mis à jour.')
      }
      setSelectedId(null)
      await reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enregistrement impossible.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner />
  if (!catalog)
    return <EmptyState icon={Briefcase} title="Catalogue inaccessible" description="Recharge la page." />

  const editing = creating || selected

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Types d’activité ({catalog.types.length})
          </h3>
          <button
            type="button"
            onClick={() => {
              setCreating(true)
              setSelectedId(null)
              setForm({ slug: '', name: '', description: '', icon: '', status: 'active' })
              setChecked([])
            }}
            className={buttonClass({ size: 'sm' })}
          >
            + Nouveau type
          </button>
        </div>
        <div className="space-y-2">
          {catalog.types.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setCreating(false)
                setSelectedId(t.id)
              }}
              className={`w-full rounded-xl border p-3 text-left transition-colors ${
                selectedId === t.id
                  ? 'border-brand-300 bg-brand-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-900">{t.name}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {STATUS_LABEL[t.status] ?? t.status}
                </span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                <code>{t.slug}</code> · {t.shops} boutique{t.shops > 1 ? 's' : ''}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        {!editing ? (
          <EmptyState
            icon={Briefcase}
            title="Sélectionne un type"
            description="Modifie ses informations et ses capabilities, ou crée un nouveau type sans toucher au code."
          />
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              {creating ? 'Nouveau type d’activité' : `Modifier — ${selected?.name}`}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {creating && (
                <label className="text-xs font-medium text-gray-700">
                  Slug (immuable après création)
                  <input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="coiffeur"
                    className={`${inputClass} mt-1 font-mono`}
                  />
                </label>
              )}
              <label className="text-xs font-medium text-gray-700">
                Nom
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Salon de coiffure"
                  className={`${inputClass} mt-1`}
                />
              </label>
              <label className="text-xs font-medium text-gray-700">
                Statut
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className={`${inputClass} mt-1`}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-gray-700 sm:col-span-2">
                Description
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ce que fait cette activité…"
                  className={`${inputClass} mt-1`}
                />
              </label>
              <label className="text-xs font-medium text-gray-700 sm:col-span-2">
                Icône (nom Lucide, optionnel)
                <input
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  placeholder="Scissors"
                  className={`${inputClass} mt-1`}
                />
              </label>
            </div>

            {!creating && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Capabilities ({checked.length})
                </p>
                <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
                  {groups.map(({ category, items }) => (
                    <div key={category}>
                      <p className="mb-1 text-xs font-medium capitalize text-gray-700">{category}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {items.map((c) => {
                          const on = checked.includes(c.code)
                          return (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => toggleCode(c.code)}
                              title={c.description ?? c.label}
                              className={`rounded-full border px-2.5 py-1 font-mono text-xs transition-colors ${
                                on
                                  ? 'border-brand-500 bg-brand-50 text-brand-800'
                                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                              }`}
                            >
                              {c.code}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className={buttonClass()}
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreating(false)
                  setSelectedId(null)
                }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
