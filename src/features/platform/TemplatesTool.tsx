import { useEffect, useState } from 'react'
import { LayoutTemplate, Plus } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  listTemplateCatalog,
  saveTemplate,
  saveTemplateCompat,
  type AdminTemplate,
  type TemplateCatalog,
} from '@/services/admin.service'
import { STORE_TEMPLATE_BY_KEY, STORE_TEMPLATES } from '@/config/storeTemplates'
import { validateTemplateContent } from '@/services/template.service'

const STATUSES = ['active', 'deprecated', 'draft'] as const

const STATUS_LABEL: Record<string, string> = {
  active: 'Actif',
  deprecated: 'Déprécié',
  draft: 'Brouillon',
}

const inputClass =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none'

function contentOf(template: AdminTemplate): string {
  if (template.content) return JSON.stringify(template.content, null, 2)
  const code = STORE_TEMPLATE_BY_KEY[template.slug]
  if (!code) return ''
  return JSON.stringify(
    { themeColor: code.themeColor, themeConfig: code.themeConfig, layout: code.layout, variants: code.variants ?? [] },
    null,
    2,
  )
}

/** Catalogue des gabarits (admin plateforme) : identité, compatibilités types
 *  et surcharge de contenu sans déploiement. Owner/admin only, serveur. */
export function TemplatesTool() {
  const toast = useToast()
  const [catalog, setCatalog] = useState<TemplateCatalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({ slug: '', name: '', description: '', status: 'active' })
  const [contentText, setContentText] = useState('')
  const [checkedTypes, setCheckedTypes] = useState<string[]>([])
  const [validationErrors, setValidationErrors] = useState<string[] | null>(null)
  const [duplicateFrom, setDuplicateFrom] = useState('')

  const reload = async () => {
    setLoading(true)
    try {
      setCatalog(await listTemplateCatalog())
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

  const selected: AdminTemplate | null = catalog?.templates.find((t) => t.id === selectedId) ?? null

  useEffect(() => {
    if (!selected || !catalog) return
    setForm({ slug: selected.slug, name: selected.name, description: selected.description ?? '', status: selected.status })
    setContentText(contentOf(selected))
    setValidationErrors(null)
    setCheckedTypes(catalog.mappings.filter((m) => m.template_id === selected.id).map((m) => m.business_type_id))
  }, [selectedId, catalog]) // eslint-disable-line react-hooks/exhaustive-deps

  const startCreate = () => {
    setCreating(true)
    setSelectedId(null)
    setForm({ slug: '', name: '', description: '', status: 'draft' })
    setContentText('')
    setCheckedTypes([])
    setValidationErrors(null)
    setDuplicateFrom('')
  }

  const parseContent = (): Record<string, unknown> | null | undefined => {
    if (!contentText.trim()) return null
    try {
      return JSON.parse(contentText) as Record<string, unknown>
    } catch {
      return undefined
    }
  }

  const handleValidate = () => {
    const parsed = parseContent()
    if (parsed === undefined) {
      setValidationErrors(['JSON invalide.'])
      return
    }
    if (parsed === null) {
      setValidationErrors([])
      toast.success('Aucune surcharge : le gabarit code fera foi.')
      return
    }
    const errors = validateTemplateContent(parsed)
    setValidationErrors(errors)
    if (errors.length === 0) toast.success('Contenu valide.')
  }

  const handleDuplicate = () => {
    const source = STORE_TEMPLATE_BY_KEY[duplicateFrom]
    if (!source) return
    setContentText(
      JSON.stringify(
        { themeColor: source.themeColor, themeConfig: source.themeConfig, layout: source.layout, variants: source.variants ?? [] },
        null,
        2,
      ),
    )
    setValidationErrors(null)
    toast.success(`Contenu dupliqué depuis « ${source.label} » — adapte puis enregistre.`)
  }

  const handleSave = async () => {
    const parsed = parseContent()
    if (parsed === undefined) {
      toast.error('JSON invalide.')
      return
    }
    if (!form.name.trim()) {
      toast.error('Le nom est requis.')
      return
    }
    if (parsed !== null) {
      const errors = validateTemplateContent(parsed)
      setValidationErrors(errors)
      if (errors.length > 0) {
        toast.error('Contenu invalide — corrige avant d’enregistrer.')
        return
      }
    }
    // Nouveau slug sans entrée code : le contenu doit être complet (vertical,
    // thème, layout), sinon le gabarit resterait invisible des pickers.
    if ((creating || !STORE_TEMPLATE_BY_KEY[form.slug]) && parsed !== null) {
      const errors = validateTemplateContent(parsed)
      const t = parsed as Record<string, unknown>
      const missing: string[] = []
      if (!t.themeColor || !t.themeConfig || !t.layout) missing.push('themeColor, themeConfig et layout sont requis pour un nouveau gabarit.')
      if (!t.vertical) missing.push('vertical est requis pour un nouveau gabarit.')
      if (missing.length > 0 || errors.length > 0) {
        setValidationErrors([...missing, ...errors])
        toast.error('Contenu incomplet pour un nouveau gabarit.')
        return
      }
    }
    setSaving(true)
    try {
      const templateId = await saveTemplate({
        id: creating ? undefined : (selected?.id ?? ''),
        slug: creating ? form.slug.trim().toLowerCase() : undefined,
        name: form.name.trim(),
        description: form.description.trim() || null,
        status: form.status,
        content: parsed,
        create: creating,
      })
      await saveTemplateCompat(templateId || selected?.id || '', checkedTypes)
      toast.success('Gabarit enregistré.')
      setCreating(false)
      await reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enregistrement impossible.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner />
  if (!catalog) return <EmptyState icon={LayoutTemplate} title="Catalogue inaccessible" />

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div>
        <button
          type="button"
          onClick={startCreate}
          className="mb-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus size={15} aria-hidden /> Nouveau gabarit
        </button>
        <ul className="space-y-1">
          {catalog.templates.map((template) => (
            <li key={template.id}>
              <button
                type="button"
                onClick={() => {
                  setCreating(false)
                  setSelectedId(template.id)
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                  selectedId === template.id && !creating
                    ? 'bg-brand-50 font-semibold text-brand-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{template.name}</span>
                  <span className="block truncate text-xs text-gray-400">
                    {template.slug} · {STATUS_LABEL[template.status] ?? template.status}
                    {template.content ? ' · surcharge' : ''}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        {!selected && !creating ? (
          <p className="text-sm text-gray-500">Sélectionne un gabarit ou crée-en un nouveau.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="template-slug" className="block text-sm font-medium text-gray-700">Slug (immuable)</label>
                <input
                  id="template-slug"
                  value={form.slug}
                  disabled={!creating}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="mon-gabarit → lettres, chiffres, _"
                  className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-400`}
                />
              </div>
              <div>
                <label htmlFor="template-status" className="block text-sm font-medium text-gray-700">Statut</label>
                <select
                  id="template-status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className={inputClass}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="template-name" className="block text-sm font-medium text-gray-700">Nom</label>
              <input
                id="template-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="template-description" className="block text-sm font-medium text-gray-700">Description</label>
              <input
                id="template-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <span className="block text-sm font-medium text-gray-700">Types d’activité compatibles</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {catalog.types.map((type) => {
                  const active = checkedTypes.includes(type.id)
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() =>
                        setCheckedTypes((prev) => (active ? prev.filter((id) => id !== type.id) : [...prev, type.id]))
                      }
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        active ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {type.name}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="template-content" className="block text-sm font-medium text-gray-700">
                  Contenu JSON (vide = gabarit code)
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={duplicateFrom}
                    onChange={(e) => setDuplicateFrom(e.target.value)}
                    aria-label="Dupliquer depuis"
                    className="rounded-lg border border-gray-200 px-2 py-1 text-xs focus:border-brand-400 focus:outline-none"
                  >
                    <option value="">Dupliquer depuis…</option>
                    {STORE_TEMPLATES.map((t) => (
                      <option key={t.key} value={t.key}>{t.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleDuplicate}
                    disabled={!duplicateFrom}
                    className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Dupliquer
                  </button>
                  <button
                    type="button"
                    onClick={handleValidate}
                    className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Valider
                  </button>
                </div>
              </div>
              <textarea
                id="template-content"
                value={contentText}
                onChange={(e) => {
                  setContentText(e.target.value)
                  setValidationErrors(null)
                }}
                rows={14}
                spellCheck={false}
                placeholder='{"themeColor": "#...", "themeConfig": {...}, "layout": {...}, "variants": [...]}'
                className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs focus:border-brand-400 focus:outline-none"
              />
              {validationErrors && validationErrors.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-xs text-red-600">
                  {validationErrors.map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                </ul>
              )}
              {validationErrors && validationErrors.length === 0 && (
                <p className="mt-1 text-xs text-emerald-600">Contenu valide.</p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
