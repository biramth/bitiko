import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Check,
  ExternalLink,
  FileText,
  Loader2,
  Lock,
  Plus,
  Redo2,
  Trash2,
  Undo2,
  Wand2,
} from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { useShopPlan } from '@/features/billing/useShopPlan'
import { useBuilderState, type BuilderTarget } from '@/features/store-builder/useBuilderState'
import { BuilderSidebar } from '@/features/store-builder/BuilderSidebar'
import { BuilderPreviewFrame } from '@/features/store-builder/BuilderPreviewFrame'
import { SectionEditorPanel } from '@/features/store-builder/SectionEditorPanel'
import { ThemeEditorPanel } from '@/features/store-builder/ThemeEditorPanel'
import { TemplateLibraryPanel } from '@/features/store-builder/TemplateLibraryPanel'
import { ensurePinnedSections } from '@/config/defaultLayout'
import { updateShop } from '@/services/shop.service'
import { listShopPages, createPage, deletePage, updatePage } from '@/services/page.service'
import { shopUrl } from '@/lib/tenant'
import { Spinner } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { usePageSeo } from '@/hooks/usePageSeo'
import type { Shop } from '@/types'
import type { LayoutSection } from '@/types/builder'

export function StoreBuilderPage() {
  usePageSeo({ title: 'Personnaliser ma boutique — Bitiko', noindex: true })
  const { data: shop, isLoading } = useMyShop()
  const { plan, isLoading: planLoading } = useShopPlan(shop?.id)

  if (isLoading || planLoading) return <Spinner />
  if (!shop) return <p className="text-sm text-gray-500">Aucune boutique configurée.</p>
  if (!plan.storeBuilderAccess) return <StoreBuilderLock />

  return <StoreBuilder key={shop.id} shop={shop} />
}

function StoreBuilderLock() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <Lock size={24} aria-hidden />
      </span>
      <h1 className="font-heading text-xl font-bold text-gray-900">Éditeur visuel réservé au plan Pro</h1>
      <p className="text-sm text-gray-500">
        Passez à Pro pour personnaliser librement l'apparence de votre boutique : thème, bannière, sections et
        bibliothèque de templates.
      </p>
      <Link
        to="/admin/facturation"
        className="mt-2 flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
      >
        <Wand2 size={15} aria-hidden /> Passer à Pro
      </Link>
    </div>
  )
}

/* ─────────────────────── Builder ─────────────────────────────── */

function StoreBuilder({ shop }: { shop: Shop }) {
  const { data: pages = [] } = useQuery({
    queryKey: ['shop-pages', shop.id],
    queryFn: () => listShopPages(shop.id),
  })

  const [activePageId, setActivePageId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false)

  const activePage = useMemo(
    () => (activePageId ? pages.find((p) => p.id === activePageId) ?? null : null),
    [pages, activePageId],
  )

  /* Build a fresh target each time the selected page changes — the `key` on
   * StoreBuilder remounts useBuilderState so it re-initialises from the new
   * target's initial snapshot. */
  const target = useMemo<BuilderTarget>(() => {
    if (!activePage) {
      return {
        initialSections: ensurePinnedSections(shop.builder_draft?.sections ?? shop.layout_sections),
        initialThemeColor: shop.builder_draft?.themeColor ?? shop.theme_color,
        initialThemeConfig: shop.builder_draft?.themeConfig ?? shop.theme_config,
        saveDraft: (snap) =>
          updateShop(shop.id, {
            builder_draft: { sections: snap.sections, themeColor: snap.themeColor, themeConfig: snap.themeConfig },
          }),
        publish: (snap) =>
          updateShop(shop.id, {
            layout_sections: snap.sections,
            theme_color: snap.themeColor,
            theme_config: snap.themeConfig,
            builder_draft: null,
          }),
        invalidateKeys: [{ queryKey: ['my-shop'] }, { queryKey: ['tenant-shop'] }],
      }
    }
    return {
      initialSections: (activePage.draft_content ?? activePage.content) as LayoutSection[],
      initialThemeColor: shop.builder_draft?.themeColor ?? shop.theme_color,
      initialThemeConfig: shop.builder_draft?.themeConfig ?? shop.theme_config,
      saveDraft: (snap) => updatePage(activePage.id, { draft_content: snap.sections as LayoutSection[] }),
      publish: async (snap) => {
        await updatePage(activePage.id, {
          content: snap.sections as LayoutSection[],
          draft_content: null,
          is_published: true,
        })
        await updateShop(shop.id, { theme_color: snap.themeColor, theme_config: snap.themeConfig })
      },
      invalidateKeys: [
        { queryKey: ['my-shop'] },
        { queryKey: ['tenant-shop'] },
        { queryKey: ['shop-pages', shop.id] },
      ],
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop, activePage?.id])

  const builder = useBuilderState(target)

  /* Keyboard shortcuts */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isEditing = !!target && !!target.closest('input, textarea, select, [contenteditable="true"]')
      const mod = e.ctrlKey || e.metaKey

      if (!isEditing && mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) builder.redo()
        else builder.undo()
        return
      }
      if (!isEditing && mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        builder.redo()
        return
      }
      if (!isEditing && (e.key === 'Delete' || e.key === 'Backspace') && builder.selectedSectionId) {
        e.preventDefault()
        builder.removeSection(builder.selectedSectionId)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [builder])

  /* Page preview path */
  const previewPagePath = activePage ? `/pages/${activePage.slug}` : '/'
  const previewUrl = shopUrl(shop.slug) + previewPagePath

  const handlePreview = async () => {
    await builder.saveDraftMutation.mutateAsync()
    window.open(`${previewUrl}${previewUrl.includes('?') ? '&' : '?'}preview=draft`, '_blank')
  }

  const handleCreatePage = async (title: string, slug: string) => {
    const page = await createPage(shop.id, title, slug)
    setCreateOpen(false)
    setActivePageId(page.id)
  }

  const handleDeletePage = async () => {
    if (!activePage) return
    await deletePage(activePage.id)
    setDeleteOpen(false)
    setActivePageId(null)
  }

  return (
    <div className="flex h-full flex-col">
      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Page selector */}
          <div className="flex items-center gap-1.5">
            <select
              value={activePageId ?? ''}
              onChange={(e) => setActivePageId(e.target.value || null)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-brand-400 focus:outline-none"
            >
              <option value="">🏠 Accueil</option>
              {pages.map((page) => (
                <option key={page.id} value={page.id}>
                  📄 {page.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              title="Nouvelle page"
              aria-label="Créer une nouvelle page"
              className="rounded-lg border border-gray-200 px-2.5 py-2 text-gray-600 hover:bg-gray-50"
            >
              <Plus size={16} aria-hidden />
            </button>
            {activePage && (
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                title="Supprimer cette page"
                aria-label="Supprimer la page"
                className="rounded-lg border border-gray-200 px-2.5 py-2 text-gray-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={16} aria-hidden />
              </button>
            )}
          </div>

          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
              <Wand2 size={20} className="text-brand-600" aria-hidden />
              {activePage ? activePage.title : 'Accueil'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {builder.dirty ? 'Modifications non enregistrées.' : 'Tout est enregistré.'}
              {activePage && !activePage.is_published && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Brouillon</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={builder.undo} disabled={!builder.canUndo} title="Annuler (Ctrl+Z)" aria-label="Annuler" className="rounded-lg border border-gray-200 px-3 py-2 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
            <Undo2 size={16} aria-hidden />
          </button>
          <button type="button" onClick={builder.redo} disabled={!builder.canRedo} title="Rétablir (Ctrl+Y)" aria-label="Rétablir" className="rounded-lg border border-gray-200 px-3 py-2 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
            <Redo2 size={16} aria-hidden />
          </button>
          <span className="mx-1 hidden text-xs text-gray-400 sm:block">Cliquez sur un bloc dans l'aperçu pour le modifier.</span>
          <button type="button" onClick={handlePreview} disabled={builder.saveDraftMutation.isPending} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            <ExternalLink size={14} aria-hidden /> Prévisualiser
          </button>
          <button type="button" onClick={() => builder.saveDraftMutation.mutate()} disabled={builder.saveDraftMutation.isPending} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            {builder.saveDraftMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : builder.saveDraftMutation.isSuccess && !builder.dirty ? <Check size={14} className="text-emerald-600" /> : null}
            Enregistrer
          </button>
          <button type="button" onClick={() => setPublishConfirmOpen(true)} disabled={builder.publishMutation.isPending} className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
            {builder.publishMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            Publier
          </button>
        </div>
      </div>

      {/* ── 3-column layout ─────────────────────────────────── */}
      <div className="grid h-[75vh] min-h-[600px] grid-cols-[16rem_1fr_20rem] overflow-hidden rounded-xl border border-gray-200">
        <BuilderSidebar
          sections={builder.sections}
          selectedSectionId={builder.selectedSectionId}
          activeTab={builder.activeTab}
          onTabChange={builder.setActiveTab}
          onSelect={builder.selectSection}
          onToggleVisible={builder.toggleVisible}
          onRemove={builder.removeSection}
          onDuplicate={builder.duplicateSection}
          onReorder={builder.reorderSection}
          onAdd={builder.addSection}
        />

        <BuilderPreviewFrame
          slug={shop.slug}
          pagePath={previewPagePath}
          sections={builder.sections}
          themeColor={builder.themeColor}
          themeConfig={builder.themeConfig}
          onSelectSection={builder.selectSection}
        />

        <div className="overflow-y-auto border-l border-gray-200 bg-white p-4">
          {builder.activeTab === 'blocks' && (
            <SectionEditorPanel
              section={builder.selectedSection}
              shopId={shop.id}
              onChange={(config) => builder.selectedSection && builder.updateSectionConfig(builder.selectedSection.id, config)}
            />
          )}
          {builder.activeTab === 'theme' && (
            <ThemeEditorPanel
              themeColor={builder.themeColor}
              themeConfig={builder.themeConfig}
              onThemeColorChange={builder.setThemeColor}
              onThemeConfigChange={builder.setThemeConfig}
            />
          )}
          {builder.activeTab === 'templates' && <TemplateLibraryPanel onApply={builder.applyTemplate} />}
        </div>
      </div>

      {/* ── Dialogs ─────────────────────────────────────────── */}
      <ConfirmDialog
        open={publishConfirmOpen}
        title="Publier ces changements ?"
        description="Ils seront immédiatement visibles par vos clients."
        confirmLabel="Publier"
        pendingLabel="Publication…"
        pending={builder.publishMutation.isPending}
        tone="default"
        onConfirm={() => builder.publishMutation.mutate(undefined, { onSuccess: () => setPublishConfirmOpen(false) })}
        onClose={() => setPublishConfirmOpen(false)}
      />
      <CreatePageDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreatePage} />
      <ConfirmDialog
        open={deleteOpen}
        title={`Supprimer « ${activePage?.title} » ?`}
        description="Cette action est irréversible. La page et son contenu seront définitivement supprimés."
        confirmLabel="Supprimer"
        pendingLabel="Suppression…"
        pending={false}
        tone="danger"
        onConfirm={handleDeletePage}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  )
}

/* ─────────────────────── Create page dialog ─────────────────── */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function CreatePageDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (title: string, slug: string) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [pending, setPending] = useState(false)

  const derivedSlug = slugify(title)

  const handleSubmit = async () => {
    if (!title.trim() || !derivedSlug) return
    setPending(true)
    try {
      await onCreate(title.trim(), derivedSlug)
      setTitle('')
    } finally {
      setPending(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-2">
          <FileText size={18} className="text-brand-600" aria-hidden />
          <h2 className="font-heading text-lg font-bold text-gray-900">Nouvelle page</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Titre</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="À propos"
              autoFocus
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">URL</label>
            <div className="mt-1 flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <span className="text-xs text-gray-400">/pages/</span>
              <input
                value={derivedSlug}
                readOnly
                className="ml-0 w-full border-0 bg-transparent text-sm font-mono text-gray-900 focus:outline-none"
              />
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!title.trim() || pending}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {pending && <Loader2 size={14} className="animate-spin" />}
            Créer la page
          </button>
        </div>
      </div>
    </div>
  )
}