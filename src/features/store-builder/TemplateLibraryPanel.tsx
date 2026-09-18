import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Eye, History, Pencil, Save, Trash2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { templatesForVertical } from '@/config/storeTemplates'
import { buildDefaultSystemTemplate } from '@/config/defaultTemplates'
import { VERTICAL_BY_KEY } from '@/config/verticals'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import {
  createSavedTheme,
  deleteSavedTheme,
  duplicateSavedTheme,
  listSavedThemes,
  renameSavedTheme,
} from '@/services/savedTheme.service'
import { listPublishHistory } from '@/services/publishHistory.service'
import type { Shop } from '@/types'
import type { SavedTheme } from '@/types/savedTheme'
import type { PublishHistoryEntry } from '@/types/publishHistory'
import { SYSTEM_TEMPLATE_KEYS, type StoreTemplate } from '@/types/builder'

/** Marks a `StoreTemplate` synthesized from a merchant's own saved theme or
 *  a past publish (see `savedThemeToTemplate`/`historyEntryToTemplate`)
 *  rather than one of the built-in per-vertical templates — applying one
 *  must skip onboarding-profile personalization and never overwrite the
 *  shop's vertical (see StoreBuilderPage's buildTarget). */
export const SAVED_THEME_KEY_PREFIX = 'saved:'
export const HISTORY_KEY_PREFIX = 'history:'
export const isSavedThemeKey = (key: string) => key.startsWith(SAVED_THEME_KEY_PREFIX)
export const isRestoredDesignKey = (key: string) => key.startsWith(SAVED_THEME_KEY_PREFIX) || key.startsWith(HISTORY_KEY_PREFIX)

/** What "the current design" means for saving a personal style: the shop's
 *  live, published design — not an in-progress unsaved draft, which the
 *  merchant can publish first if they want that captured instead. */
function currentPublishedSnapshot(shop: Shop) {
  return {
    themeColor: shop.theme_color,
    themeConfig: shop.theme_config,
    sections: shop.layout_sections,
    templates: Object.fromEntries(
      SYSTEM_TEMPLATE_KEYS.map((key) => [key, shop.page_templates?.[key]?.published ?? buildDefaultSystemTemplate(key)]),
    ) as Record<(typeof SYSTEM_TEMPLATE_KEYS)[number], ReturnType<typeof buildDefaultSystemTemplate>>,
  }
}

const historyDateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function historyEntryToTemplate(entry: PublishHistoryEntry, businessType: string | null): StoreTemplate {
  return {
    key: `${HISTORY_KEY_PREFIX}${entry.id}`,
    vertical: businessType ?? '',
    label: historyDateFormat.format(new Date(entry.published_at)),
    description: 'Version publiée précédemment.',
    swatch: [entry.theme_color, entry.theme_config.secondaryColor],
    themeColor: entry.theme_color,
    themeConfig: entry.theme_config,
    layout: {
      home: entry.sections,
      catalogue: entry.templates.catalogue ?? [],
      product: entry.templates.product ?? [],
      cart: entry.templates.cart ?? [],
      checkout: entry.templates.checkout ?? [],
      not_found: entry.templates.not_found,
    },
  }
}

function savedThemeToTemplate(theme: SavedTheme, businessType: string | null): StoreTemplate {
  return {
    key: `${SAVED_THEME_KEY_PREFIX}${theme.id}`,
    vertical: businessType ?? '',
    label: theme.name,
    description: 'Votre style personnel enregistré.',
    swatch: [theme.theme_color, theme.theme_config.secondaryColor],
    themeColor: theme.theme_color,
    themeConfig: theme.theme_config,
    layout: {
      home: theme.sections,
      catalogue: theme.templates.catalogue ?? [],
      product: theme.templates.product ?? [],
      cart: theme.templates.cart ?? [],
      checkout: theme.templates.checkout ?? [],
      not_found: theme.templates.not_found,
    },
  }
}

/** A tiny CSS-only storefront mockup so a template reads as "a real shop", not a color swatch.
 *  Uses the template's home layout to pick the mockup composition. */
function TemplateThumbnail({ template }: { template: StoreTemplate }) {
  const [accent, secondary] = template.swatch
  const hasCategories = template.layout.home.some((s) => s.type === 'categories')

  return (
    <div
      className="h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white"
      style={{ fontFamily: template.themeConfig.font === 'inter' ? 'Inter, sans-serif' : undefined }}
    >
      <div className="flex h-2.5 items-center justify-between bg-white px-1.5">
        <span className="h-1 w-3 rounded-full" style={{ backgroundColor: template.themeColor }} />
        <span className="h-1 w-1 rounded-full bg-gray-300" />
      </div>
      <div className="h-5 w-full" style={{ background: `linear-gradient(135deg, ${accent}, ${secondary})` }} />
      <div className="flex gap-1 p-1.5">
        {hasCategories ? (
          <>
            <span className="h-6 flex-1 rounded-sm" style={{ backgroundColor: template.themeColor }} />
            <span className="h-6 flex-1 rounded-sm" style={{ backgroundColor: secondary }} />
            <span className="h-6 flex-1 rounded-sm" style={{ backgroundColor: template.themeConfig.textColor, opacity: 0.15 }} />
          </>
        ) : (
          <>
            <span className="h-6 flex-1 rounded-sm bg-gray-100" />
            <span className="h-6 flex-1 rounded-sm bg-gray-100" />
            <span className="h-6 flex-1 rounded-sm bg-gray-100" />
          </>
        )}
      </div>
    </div>
  )
}

function SavedThemeRow({
  theme,
  isPreviewing,
  onPreview,
  onRename,
  onDuplicate,
  onDelete,
  businessType,
}: {
  theme: SavedTheme
  isPreviewing: boolean
  onPreview: (template: StoreTemplate) => void
  onRename: () => void
  onDuplicate: () => void
  onDelete: () => void
  businessType: string | null
}) {
  const template = savedThemeToTemplate(theme, businessType)
  return (
    <div
      className={`group flex items-center gap-3 rounded-xl border p-3 ${
        isPreviewing ? 'border-brand-500 ring-1 ring-brand-500' : 'border-gray-200'
      }`}
    >
      <button type="button" onClick={() => onPreview(template)} aria-pressed={isPreviewing} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <TemplateThumbnail template={template} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="block truncate text-sm font-semibold text-gray-900">{theme.name}</span>
            {isPreviewing && (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                <Eye size={10} aria-hidden /> Aperçu
              </span>
            )}
          </span>
          <span className="block text-xs text-gray-500">Style personnel</span>
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <button type="button" onClick={onRename} aria-label="Renommer" title="Renommer" className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <Pencil size={14} />
        </button>
        <button type="button" onClick={onDuplicate} aria-label="Dupliquer" title="Dupliquer" className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <Copy size={14} />
        </button>
        <button type="button" onClick={onDelete} aria-label="Supprimer" title="Supprimer" className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

export function TemplateLibraryPanel({
  shop,
  previewingKey,
  onPreview,
}: {
  shop: Shop
  /** Key of the template currently shown in the live preview, if any. */
  previewingKey: string | null
  onPreview: (template: StoreTemplate) => void
}) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const templates = templatesForVertical(shop.business_type)
  const vertical = shop.business_type ? VERTICAL_BY_KEY[shop.business_type] : undefined

  const { data: savedThemes = [] } = useQuery({
    queryKey: ['saved-themes', shop.id],
    queryFn: () => listSavedThemes(shop.id),
  })

  // Best-effort: the migration adding shop_publish_history may not be live
  // yet on every shop's project, so a query error here just means an empty
  // history list rather than breaking the whole Styles tab.
  const { data: publishHistory = [] } = useQuery({
    queryKey: ['publish-history', shop.id],
    queryFn: () => listPublishHistory(shop.id),
    retry: false,
    throwOnError: false,
  })

  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [renaming, setRenaming] = useState<SavedTheme | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleting, setDeleting] = useState<SavedTheme | null>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['saved-themes', shop.id] })

  const saveMutation = useMutation({
    mutationFn: () => createSavedTheme(shop.id, saveName.trim(), currentPublishedSnapshot(shop)),
    onSuccess: () => {
      invalidate()
      setSaveDialogOpen(false)
      setSaveName('')
      toast.success('Style enregistré.')
    },
  })

  const renameMutation = useMutation({
    mutationFn: () => renameSavedTheme(renaming!.id, renameValue.trim()),
    onSuccess: () => {
      invalidate()
      setRenaming(null)
      toast.success('Style renommé.')
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: (theme: SavedTheme) => duplicateSavedTheme(theme),
    onSuccess: () => {
      invalidate()
      toast.success('Style dupliqué.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteSavedTheme(deleting!.id),
    onSuccess: () => {
      invalidate()
      setDeleting(null)
      toast.success('Style supprimé.')
    },
  })

  return (
    <div>
      <p className="mb-1 text-sm text-gray-500">
        Un style redessine toute votre boutique d'un coup : couleurs, typographie et mise en page de l'accueil, du
        catalogue, de la fiche produit, du panier et de la commande — vos pages personnalisées ne sont pas touchées.
        Cliquez sur un style pour le prévisualiser avec vos propres données dans l'aperçu, puis appliquez-le si vous
        l'aimez. Vos réglages précis restent modifiables ensuite dans l'onglet Thème.
      </p>
      <p className="mb-4 text-xs text-gray-400">
        {vertical ? `Styles pour votre activité « ${vertical.label} ».` : 'Tous les styles.'}{' '}
        <Link to="/admin/parametres" className="font-medium text-brand-700 hover:text-brand-800">
          Changer de type de commerce
        </Link>{' '}
        pour voir d'autres styles.
      </p>
      <div className="space-y-3">
        {templates.map((template) => {
          const isCurrent = shop.template_id === template.key
          const isPreviewing = previewingKey === template.key
          return (
            <button
              key={template.key}
              type="button"
              onClick={() => onPreview(template)}
              aria-pressed={isPreviewing}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left hover:border-brand-300 hover:bg-brand-50/40 ${
                isPreviewing ? 'border-brand-500 ring-1 ring-brand-500' : isCurrent ? 'border-brand-300 bg-brand-50/40' : 'border-gray-200'
              }`}
            >
              <TemplateThumbnail template={template} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="block text-sm font-semibold text-gray-900">{template.label}</span>
                  {isCurrent && (
                    <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                      Actuel
                    </span>
                  )}
                  {isPreviewing && (
                    <span className="flex items-center gap-1 rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      <Eye size={10} aria-hidden /> Aperçu
                    </span>
                  )}
                </span>
                <span className="block text-xs text-gray-500">{template.description}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-6 border-t border-gray-200 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Mes styles</p>
          <button
            type="button"
            onClick={() => setSaveDialogOpen(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:text-brand-800"
          >
            <Save size={13} aria-hidden /> Enregistrer le style actuel
          </button>
        </div>
        {savedThemes.length === 0 ? (
          <p className="text-xs text-gray-400">
            Aucun style personnel pour l'instant. Enregistrez le design actuel de votre boutique pour le retrouver ou le dupliquer plus tard.
          </p>
        ) : (
          <div className="space-y-3">
            {savedThemes.map((theme) => (
              <SavedThemeRow
                key={theme.id}
                theme={theme}
                businessType={shop.business_type}
                isPreviewing={previewingKey === `${SAVED_THEME_KEY_PREFIX}${theme.id}`}
                onPreview={onPreview}
                onRename={() => {
                  setRenaming(theme)
                  setRenameValue(theme.name)
                }}
                onDuplicate={() => duplicateMutation.mutate(theme)}
                onDelete={() => setDeleting(theme)}
              />
            ))}
          </div>
        )}
      </div>

      {publishHistory.length > 0 && (
        <div className="mt-6 border-t border-gray-200 pt-4">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
            <History size={13} aria-hidden /> Historique des publications
          </p>
          <p className="mb-3 text-xs text-gray-400">
            Chaque publication archive automatiquement la version précédente. Cliquez sur une version pour la prévisualiser, puis appliquez-la pour y revenir.
          </p>
          <div className="space-y-3">
            {publishHistory.map((entry) => {
              const template = historyEntryToTemplate(entry, shop.business_type)
              const isPreviewing = previewingKey === template.key
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onPreview(template)}
                  aria-pressed={isPreviewing}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left hover:border-brand-300 hover:bg-brand-50/40 ${
                    isPreviewing ? 'border-brand-500 ring-1 ring-brand-500' : 'border-gray-200'
                  }`}
                >
                  <TemplateThumbnail template={template} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="block text-sm font-semibold text-gray-900">{template.label}</span>
                      {isPreviewing && (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          <Eye size={10} aria-hidden /> Aperçu
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-gray-500">{template.description}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={saveDialogOpen}
        title="Enregistrer le style actuel"
        description="Sauvegarde le design actuellement en ligne de votre boutique (thème, accueil, catalogue, fiche produit, panier, commande et page 404) sous un nom, pour le retrouver plus tard."
        tone="default"
        confirmLabel="Enregistrer"
        pendingLabel="Enregistrement…"
        pending={saveMutation.isPending}
        confirmDisabled={!saveName.trim()}
        onConfirm={() => saveMutation.mutate()}
        onClose={() => {
          setSaveDialogOpen(false)
          setSaveName('')
        }}
      >
        <input
          autoFocus
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          placeholder="Ex. Édition Ramadan"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none"
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={renaming !== null}
        title="Renommer ce style"
        tone="default"
        confirmLabel="Renommer"
        pendingLabel="Renommage…"
        pending={renameMutation.isPending}
        confirmDisabled={!renameValue.trim()}
        onConfirm={() => renameMutation.mutate()}
        onClose={() => setRenaming(null)}
      >
        <input
          autoFocus
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-400 focus:outline-none"
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={deleting !== null}
        title={`Supprimer « ${deleting?.name ?? ''} » ?`}
        confirmLabel="Supprimer"
        pendingLabel="Suppression…"
        pending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}
