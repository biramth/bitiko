import { useEffect, useState } from 'react'
import { Eye, LayoutTemplate, Plus, Star, Trash2 } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  deleteTemplate,
  listTemplateCatalog,
  saveTemplate,
  saveTemplateCompat,
  type AdminTemplate,
  type TemplateCatalog,
} from '@/services/admin.service'
import { STORE_TEMPLATE_BY_KEY, STORE_TEMPLATES } from '@/config/storeTemplates'
import { validateTemplateContent } from '@/services/template.service'
import { TemplateContentPreview, type Section } from './TemplateContentPreview'
import { DEFAULT_THEME_CONFIG } from '@/config/themeTokens'
import type { ThemeConfig } from '@/types/builder'
import { buttonClass } from '@/components/ui/styles'

const STATUSES = ['active', 'deprecated', 'draft'] as const

const STATUS_LABEL: Record<string, string> = {
  active: 'Actif',
  deprecated: 'Déprécié',
  draft: 'Brouillon',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
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

/** Catalogue des templates (admin plateforme) : identité, compatibilités types
 *  et surcharge de contenu sans déploiement. Owner/admin only, serveur. */
export function TemplatesTool() {
  const toast = useToast()
  const [catalog, setCatalog] = useState<TemplateCatalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AdminTemplate | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [form, setForm] = useState({ slug: '', name: '', description: '', status: 'active' })
  const [contentText, setContentText] = useState('')
  const [checkedTypes, setCheckedTypes] = useState<string[]>([])
  const [ownerBusinessTypeId, setOwnerBusinessTypeId] = useState('')
  const [validationErrors, setValidationErrors] = useState<string[] | null>(null)
  const [duplicateFrom, setDuplicateFrom] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)

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
    setOwnerBusinessTypeId(selected.owner_business_type_id ?? '')
  }, [selectedId, catalog]) // eslint-disable-line react-hooks/exhaustive-deps

  const startCreate = () => {
    setCreating(true)
    setSelectedId(null)
    setForm({ slug: '', name: '', description: '', status: 'draft' })
    setContentText('')
    setCheckedTypes([])
    setOwnerBusinessTypeId('')
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

  // Un nouveau slug sans entrée code doit être complet (vertical, thème, layout),
  // sinon le template resterait invisible des pickers — appliqué par « Valider »
  // ET par « Enregistrer », qui affichaient auparavant deux règles différentes.
  const isNewSlug = creating || !STORE_TEMPLATE_BY_KEY[form.slug]
  const checkContent = (parsed: Record<string, unknown> | null): string[] => {
    if (parsed === null) return []
    const errors = validateTemplateContent(parsed)
    if (!isNewSlug) return errors
    const missing: string[] = []
    if (!parsed.themeColor || !parsed.themeConfig || !parsed.layout) missing.push('themeColor, themeConfig et layout sont requis pour un nouveau template.')
    if (!parsed.vertical) missing.push('vertical est requis pour un nouveau template.')
    return [...missing, ...errors]
  }

  const handleValidate = () => {
    const parsed = parseContent()
    if (parsed === undefined) {
      setValidationErrors(['JSON invalide.'])
      return
    }
    if (parsed === null) {
      setValidationErrors([])
      toast.success('Aucune surcharge : le template code fera foi.')
      return
    }
    const errors = checkContent(parsed)
    setValidationErrors(errors)
    if (errors.length === 0) toast.success('Contenu valide.')
  }

  const handleDuplicate = () => {
    // La liste couvre les deux origines : gabarits du code (STORE_TEMPLATES) et
    // gabarits créés uniquement en base par un·e collègue (catalog.templates.content).
    const dbSource = catalog?.templates.find((t) => t.slug === duplicateFrom && t.content)
    const codeSource = STORE_TEMPLATE_BY_KEY[duplicateFrom]
    if (dbSource?.content) {
      setContentText(JSON.stringify(dbSource.content, null, 2))
      setValidationErrors(null)
      toast.success(`Contenu dupliqué depuis « ${dbSource.name} » — adapte puis enregistre.`)
      return
    }
    if (!codeSource) return
    setContentText(
      JSON.stringify(
        { themeColor: codeSource.themeColor, themeConfig: codeSource.themeConfig, layout: codeSource.layout, variants: codeSource.variants ?? [] },
        null,
        2,
      ),
    )
    setValidationErrors(null)
    toast.success(`Contenu dupliqué depuis « ${codeSource.label} » — adapte puis enregistre.`)
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
    const errors = checkContent(parsed)
    if (errors.length > 0) {
      setValidationErrors(errors)
      toast.error('Contenu invalide — corrige avant d’enregistrer.')
      return
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
        ownerBusinessTypeId: ownerBusinessTypeId || null,
        create: creating,
      })
      await saveTemplateCompat(templateId || selected?.id || '', checkedTypes)
      toast.success('Template enregistré.')
      setCreating(false)
      await reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enregistrement impossible.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteTemplate(deleteTarget.id)
      toast.success('Template supprimé.')
      setDeleteTarget(null)
      if (selectedId === deleteTarget.id) setSelectedId(null)
      await reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Suppression impossible.')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <Spinner />
  if (!catalog) return <EmptyState icon={LayoutTemplate} title="Catalogue inaccessible" />

  const ownedTypeIds = new Set(catalog.templates.map((t) => t.owner_business_type_id).filter((id): id is string => !!id))
  const typesWithoutOwnedTemplate = catalog.types.filter((type) => !ownedTypeIds.has(type.id))

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div>
        {typesWithoutOwnedTemplate.length > 0 && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <p className="font-medium">Aucun template propre :</p>
            <p className="mt-0.5">{typesWithoutOwnedTemplate.map((t) => t.name).join(', ')}</p>
          </div>
        )}
        <button
          type="button"
          onClick={startCreate}
          className="mb-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus size={15} aria-hidden /> Nouveau template
        </button>
        <ul className="space-y-1">
          {catalog.templates.map((template) => (
            <li key={template.id} className="group flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setCreating(false)
                  setSelectedId(template.id)
                }}
                className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
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
                    {template.shops > 0 ? ` · ${template.shops} boutique(s)` : ''}
                  </span>
                  {template.owner_business_type_id && (
                    <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-brand-600">
                      <Star size={10} aria-hidden fill="currentColor" />
                      {catalog.types.find((t) => t.id === template.owner_business_type_id)?.name ?? 'Propre'}
                    </span>
                  )}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(template)}
                aria-label={`Supprimer ${template.name}`}
                title={template.shops > 0 ? 'En usage : passe-le en déprécié' : 'Supprimer'}
                className="shrink-0 rounded p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
              >
                <Trash2 size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        {!selected && !creating ? (
          <p className="text-sm text-gray-500">Sélectionne un template ou crée-en un nouveau.</p>
        ) : (
          <div className="space-y-4">
            {creating && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Pour un vrai nouveau style, le chemin code (<code className="font-mono">npm run template:new</code>, voir
                docs/templates.md) reste le plus sûr — testé, revu, versionné. Ce formulaire sert aux ajustements urgents ou
                expérimentaux, sans déploiement.
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="template-slug" className="block text-sm font-medium text-gray-700">Slug (immuable)</label>
                <input
                  id="template-slug"
                  value={form.slug}
                  disabled={!creating}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="mon-template → lettres, chiffres, _"
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
              <label htmlFor="template-owner" className="block text-sm font-medium text-gray-700">
                Propriétaire (activité d’origine)
              </label>
              <select
                id="template-owner"
                value={ownerBusinessTypeId}
                onChange={(e) => {
                  const id = e.target.value
                  setOwnerBusinessTypeId(id)
                  // Un propriétaire non coché dans les compatibilités resterait invisible
                  // du picker de cette activité — on l'ajoute, modifiable ensuite.
                  if (id) setCheckedTypes((prev) => (prev.includes(id) ? prev : [...prev, id]))
                }}
                className={inputClass}
              >
                <option value="">Aucun (template partagé)</option>
                {catalog.types.map((type) => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">
                L’activité à laquelle ce template appartient à l’origine. Une activité doit toujours posséder au moins un
                template propre — les autres restent des compatibilités partagées ci-dessous.
              </p>
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
                  Contenu JSON (vide = template code)
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
                    {(catalog?.templates ?? [])
                      .filter((t) => t.content && !STORE_TEMPLATE_BY_KEY[t.slug])
                      .map((t) => (
                        <option key={t.id} value={t.slug}>{t.name} (base)</option>
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
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(true)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Eye size={12} aria-hidden /> Aperçu
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
                className={buttonClass()}
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Aperçu"
        description="Statique : couleurs, ordre des blocs et textes réels ; les sections à données (produits, équipe…) sont génériques."
        size="lg"
      >
        {(() => {
          const parsed = parseContent()
          if (parsed === undefined) return <p className="text-sm text-red-600">JSON invalide — corrige-le avant l’aperçu.</p>
          const base = STORE_TEMPLATE_BY_KEY[form.slug]
          const effective = base
            ? { themeColor: base.themeColor, themeConfig: base.themeConfig, layout: base.layout, ...(parsed ?? {}) }
            : parsed
          if (!effective || !effective.layout || !isRecord(effective.layout) || !Array.isArray((effective.layout as Record<string, unknown>).home)) {
            return <p className="text-sm text-gray-500">Rien à prévisualiser : ajoute au moins themeColor, themeConfig et layout.home.</p>
          }
          const layout = effective.layout as { home: Section[] }
          return (
            <TemplateContentPreview
              themeColor={(effective.themeColor as string) ?? '#d9612e'}
              themeConfig={(effective.themeConfig as ThemeConfig) ?? DEFAULT_THEME_CONFIG}
              home={layout.home}
            />
          )
        })()}
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Supprimer ce template ?"
        description={
          deleteTarget
            ? deleteTarget.shops > 0
              ? `« ${deleteTarget.name} » est utilisé par ${deleteTarget.shops} boutique(s) : suppression refusée. Passe-le en déprécié pour le retirer des pickers sans casser les vitrines.`
              : deleteTarget.owner_business_type_id
                ? `« ${deleteTarget.name} » (${deleteTarget.slug}) sera définitivement supprimé, avec ses compatibilités — et c'est le template propre de « ${catalog.types.find((t) => t.id === deleteTarget.owner_business_type_id)?.name ?? '?'} », qui réapparaîtra donc dans l'alerte « aucun template propre ».`
                : `« ${deleteTarget.name} » (${deleteTarget.slug}) sera définitivement supprimé du catalogue, avec ses compatibilités. Les vitrines existantes n’en dépendent pas.`
            : undefined
        }
        confirmLabel={deleteTarget && deleteTarget.shops > 0 ? 'Compris' : 'Supprimer'}
        pendingLabel="Suppression…"
        pending={deleting}
        onConfirm={() => {
          if (deleteTarget && deleteTarget.shops > 0) setDeleteTarget(null)
          else void handleDelete()
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
