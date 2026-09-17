import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Check,
  ExternalLink,
  Loader2,
  Lock,
  Redo2,
  RotateCcw,
  Undo2,
  Wand2,
} from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { useShopPlan } from '@/features/billing/useShopPlan'
import { useBuilderState, type BuilderSnapshot, type BuilderTarget } from '@/features/store-builder/useBuilderState'
import { BuilderSidebar } from '@/features/store-builder/BuilderSidebar'
import { BuilderPreviewFrame } from '@/features/store-builder/BuilderPreviewFrame'
import { PageSwitcher } from '@/features/store-builder/PageSwitcher'
import { SectionEditorPanel } from '@/features/store-builder/SectionEditorPanel'
import { ThemeEditorPanel } from '@/features/store-builder/ThemeEditorPanel'
import { TemplateLibraryPanel } from '@/features/store-builder/TemplateLibraryPanel'
import { ensurePinnedSections } from '@/config/defaultLayout'
import { buildDefaultSystemTemplate } from '@/config/defaultTemplates'
import { updateShop } from '@/services/shop.service'
import { listShopPages, createPage, deletePage, updatePage } from '@/services/page.service'
import { useActiveProducts } from '@/features/products/useProducts'
import { storefrontUrl } from '@/lib/tenant'
import { PageLoader } from '@/components/ui/PageLoader'
import { Dialog } from '@/components/ui/Dialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { usePageSeo } from '@/hooks/usePageSeo'
import type { Shop, StorePage } from '@/types'
import type { LayoutSection, SectionType, StoreTemplate, SystemTemplateKey } from '@/types/builder'

export function StoreBuilderPage() {
  usePageSeo({ title: 'Personnaliser ma boutique — Bitiko', noindex: true })
  const { data: shop, isLoading } = useMyShop()
  const { plan, isLoading: planLoading } = useShopPlan(shop?.id)

  if (isLoading || planLoading) return <PageLoader />
  if (!shop) return <p className="text-sm text-gray-500">Aucune boutique configurée.</p>
  if (!plan.storeBuilderAccess) return <StoreBuilderLock />

  return <StoreBuilder key={shop.id} shop={shop} plan={plan} />
}

function StoreBuilderLock() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <Lock size={24} aria-hidden />
      </span>
      <h1 className="font-heading text-xl font-bold text-gray-900">Personnalisez votre boutique</h1>
      <p className="text-sm text-gray-500">
        Cette fonctionnalité est incluse dans les offres payantes. Passez à Essentiel ou Pro pour débloquer les
        outils avancés de personnalisation.
      </p>
      <Link
        to="/admin/parametres/facturation"
        className="mt-2 flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
      >
        <Wand2 size={15} aria-hidden /> Passer à Pro
      </Link>
    </div>
  )
}

/* ─────────────────────── Template contexts ─────────────────────── */

/** What's currently being edited: the home page, a system template (all pages
 *  are templates, Shopify-style) or one of the merchant's custom pages. */
export type ActiveKey = 'home' | SystemTemplateKey | `page:${string}`

type PreparedContext =
  | { kind: 'home'; label: string }
  | { kind: 'system'; key: SystemTemplateKey; label: string }
  | { kind: 'page'; page: StorePage; label: string }

const HOME_CONTEXT: PreparedContext = { kind: 'home', label: 'Accueil' }

const SYSTEM_LABELS: Record<SystemTemplateKey, string> = { catalogue: 'Catalogue', product: 'Fiche produit', cart: 'Panier', checkout: 'Commande' }

function resolveContext(key: ActiveKey, pages: StorePage[]): PreparedContext {
  if (key === 'home') return HOME_CONTEXT
  if (key === 'catalogue' || key === 'product' || key === 'cart' || key === 'checkout') {
    return { kind: 'system', key, label: SYSTEM_LABELS[key] }
  }
  const page = pages.find((p) => p.id === key.slice('page:'.length))
  return page ? { kind: 'page', page, label: page.title } : HOME_CONTEXT
}

/** Maps a storefront path (posted by the embedded preview) back to a builder
 *  context so the editor follows the page being viewed. */
function pathToKey(path: string, pages: StorePage[]): ActiveKey | null {
  const clean = path.length > 1 ? path.replace(/\/+$/, '') : path
  if (clean === '' || clean === '/') return 'home'
  if (clean === '/catalogue') return 'catalogue'
  if (clean === '/panier') return 'cart'
  if (clean === '/commande') return 'checkout'
  if (clean.startsWith('/produits/')) return 'product'
  const match = clean.match(/^\/pages\/(.+)$/)
  if (match) {
    const page = pages.find((p) => p.slug === match[1])
    if (page) return `page:${page.id}`
  }
  return null
}

/** Addable section types per system template (keeps the commerce toolbox
 *  relevant on the page it belongs to). Home/pages keep everything. */
const TEMPLATE_ADDABLE: Record<SystemTemplateKey, SectionType[]> = {
  catalogue: ['products', 'text', 'categories'],
  product: ['product', 'text', 'image'],
  cart: ['cart', 'text'],
  checkout: ['checkout', 'text'],
}

/** Persist an applied store-wide template as the shop's whole-store draft
 *  (theme + home + all four system templates), so the entire store previews the
 *  new design before anything is published. */
function storeApplyDraft(shop: Shop): (template: StoreTemplate) => Promise<unknown> {
  return (template) =>
    updateShop(shop.id, {
      builder_draft: {
        sections: ensurePinnedSections(template.layout.home),
        themeColor: template.themeColor,
        themeConfig: template.themeConfig,
        templates: {
          catalogue: template.layout.catalogue,
          product: template.layout.product,
          cart: template.layout.cart,
          checkout: template.layout.checkout,
        },
        templateId: template.key,
      },
    })
}

/** Publish the WHOLE store at once: the global theme, the home sections and
 *  every system template's published layout (using the live snapshot for the
 *  active context, the store-wide draft — or what's already published — for
 *  the others). This is the "publish the template" action the merchant expects. */
function publishStore(shop: Shop, context: PreparedContext, snap: BuilderSnapshot): Promise<unknown> {
  const draft = shop.builder_draft
  const homeSections: LayoutSection[] =
    context.kind === 'home' ? snap.sections : draft?.sections ?? shop.layout_sections

  const systemPublished = (key: SystemTemplateKey): LayoutSection[] => {
    const live = context.kind === 'system' && context.key === key ? snap.sections : undefined
    return (
      live ??
      draft?.templates?.[key] ??
      shop.page_templates?.[key]?.published ??
      buildDefaultSystemTemplate(key)
    )
  }

  return updateShop(shop.id, {
    layout_sections: homeSections,
    theme_color: snap.themeColor,
    theme_config: snap.themeConfig,
    page_templates: {
      catalogue: { published: systemPublished('catalogue') },
      product: { published: systemPublished('product') },
      cart: { published: systemPublished('cart') },
      checkout: { published: systemPublished('checkout') },
    },
    // Only set when the draft came from applying a whole-store template
    // (see storeApplyDraft) — a merchant tweaking colors/sections by hand
    // isn't "switching template", so template_id is left untouched then.
    ...(draft?.templateId ? { template_id: draft.templateId } : {}),
    builder_draft: null,
  })
}

function buildTarget(context: PreparedContext, shop: Shop): BuilderTarget {
  const shared = {
    initialThemeColor: shop.builder_draft?.themeColor ?? shop.theme_color,
    initialThemeConfig: shop.builder_draft?.themeConfig ?? shop.theme_config,
    storeApplyDraft: storeApplyDraft(shop),
    publish: (snap: BuilderSnapshot) => publishStore(shop, context, snap),
    invalidateKeys: [{ queryKey: ['my-shop'] }, { queryKey: ['tenant-shop'] }],
  }

  if (context.kind === 'home') {
    return {
      ...shared,
      initialSections: ensurePinnedSections(shop.builder_draft?.sections ?? shop.layout_sections),
      publishedSnapshot: {
        sections: ensurePinnedSections(shop.layout_sections),
        themeColor: shop.theme_color,
        themeConfig: shop.theme_config,
      },
      templateSections: (tpl) => ensurePinnedSections(tpl.layout.home),
      saveDraft: (snap) =>
        updateShop(shop.id, {
          builder_draft: {
            sections: snap.sections,
            themeColor: snap.themeColor,
            themeConfig: snap.themeConfig,
            templates: shop.builder_draft?.templates,
          },
        }),
    }
  }

  if (context.kind === 'system') {
    return {
      ...shared,
      initialSections:
        shop.builder_draft?.templates?.[context.key] ??
        shop.page_templates?.[context.key]?.published ??
        buildDefaultSystemTemplate(context.key),
      publishedSnapshot: {
        sections: shop.page_templates?.[context.key]?.published ?? buildDefaultSystemTemplate(context.key),
        themeColor: shop.theme_color,
        themeConfig: shop.theme_config,
      },
      templateSections: (tpl) => tpl.layout[context.key],
      saveDraft: (snap) =>
        updateShop(shop.id, {
          builder_draft: {
            sections: shop.builder_draft?.sections ?? shop.layout_sections,
            themeColor: snap.themeColor,
            themeConfig: snap.themeConfig,
            templates: {
              ...(shop.builder_draft?.templates ?? {}),
              [context.key]: snap.sections,
            },
          },
        }),
    }
  }

  // Custom page — content lives in `pages`, the theme is still shop-wide.
  const page = context.page
  return {
    ...shared,
    initialSections: (page.draft_content ?? page.content) as LayoutSection[],
    publishedSnapshot: {
      sections: (page.content ?? []) as LayoutSection[],
      themeColor: shop.theme_color,
      themeConfig: shop.theme_config,
    },
    templateSections: (_tpl, initialSections) => initialSections,
    saveDraft: (snap) => updatePage(page.id, { draft_content: snap.sections as LayoutSection[] }),
    publish: async (snap) => {
      await updatePage(page.id, {
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
}

/** Preview URL (with preview=draft appended by the frame) per context.
 *  Returns null when no real storefront page can represent it (product
 *  template without any active product). */
function contextPreviewPath(context: PreparedContext, productSlug: string | null): string | null {
  switch (context.kind) {
    case 'home':
      return '/'
    case 'system':
      if (context.key === 'catalogue') return '/catalogue'
      if (context.key === 'cart') return '/panier'
      if (context.key === 'checkout') return '/commande'
      return productSlug ? `/produits/${productSlug}` : null
    case 'page':
      return `/pages/${context.page.slug}`
  }
}

/* ─────────────────────── Builder ─────────────────────────────── */

function StoreBuilder({ shop, plan }: { shop: Shop; plan: ReturnType<typeof useShopPlan>['plan'] }) {
  const toast = useToast()
  const { data: pages = [] } = useQuery({
    queryKey: ['shop-pages', shop.id],
    queryFn: () => listShopPages(shop.id),
  })
  // Newest active product, used as the default product shown in the "Fiche
  // produit" template preview when the merchant hasn't clicked one yet.
  const { data: activeProducts } = useActiveProducts({ shopId: shop.id, sort: 'recent', page: 1 })
  const firstProductSlug = useMemo(() => activeProducts?.products[0]?.slug ?? null, [activeProducts])

  const [activeKey, setActiveKey] = useState<ActiveKey>('home')
  const [createOpen, setCreateOpen] = useState(false)
  const [pageToDelete, setPageToDelete] = useState<StorePage | null>(null)
  const [navigatedProductSlug, setNavigatedProductSlug] = useState<string | null>(null)

  const context = resolveContext(activeKey, pages)
  const productSlug = navigatedProductSlug ?? firstProductSlug

  /** Preview navigated inside the iframe — follow it ("suivre la page"). */
  const handleNavigate = (path: string) => {
    const slugMatch = path.match(/^\/produits\/([^/]+)$/)
    if (slugMatch) setNavigatedProductSlug(decodeURIComponent(slugMatch[1]))
    const key = pathToKey(path, pages)
    if (key && key !== activeKey) setActiveKey(key)
  }

  const handleCreatePage = async (title: string, slug: string) => {
    if (plan.maxCustomPages !== null && pages.length >= plan.maxCustomPages) {
      toast.error(`Votre plan ${plan.label} est limité à ${plan.maxCustomPages} page${plan.maxCustomPages > 1 ? 's' : ''} personnalisée${plan.maxCustomPages > 1 ? 's' : ''}.`)
      setCreateOpen(false)
      return
    }
    const page = await createPage(shop.id, title, slug)
    setCreateOpen(false)
    setActiveKey(`page:${page.id}`)
    toast.success('Page créée.')
  }

  const handleDeletePage = async () => {
    if (!pageToDelete) return
    await deletePage(pageToDelete.id)
    if (activeKey === `page:${pageToDelete.id}`) setActiveKey('home')
    setPageToDelete(null)
    toast.success('Page supprimée.')
  }

  const target = useMemo<BuilderTarget>(
    () => buildTarget(context, shop),
    // context identity changes whenever activeKey/pages do (see resolveContext)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shop, context, pages],
  )

  const previewPath = contextPreviewPath(context, productSlug)
  const previewTemplateKey = context.kind === 'system' ? context.key : undefined
  const availableTypes = context.kind === 'system' ? TEMPLATE_ADDABLE[context.key] : undefined
  const draftBadge = context.kind === 'page' && !context.page.is_published
  const publishesStore = context.kind !== 'page'
  // Whether there's a persisted draft to discard even with no unsaved local
  // edits (e.g. saved last session, came back without touching anything).
  const hasStoredDraft =
    context.kind === 'home'
      ? shop.builder_draft?.sections != null
      : context.kind === 'system'
        ? shop.builder_draft?.templates?.[context.key] != null
        : context.page.draft_content != null

  return (
    <>
      <BuilderEditor
        key={activeKey}
        shop={shop}
        removableBranding={plan.removableBranding}
        target={target}
        label={context.label}
        previewPath={previewPath}
        previewTemplateKey={previewTemplateKey}
        availableTypes={availableTypes}
        draftBadge={draftBadge}
        hasStoredDraft={hasStoredDraft}
        onContextChange={setActiveKey}
        onCreatePage={() => setCreateOpen(true)}
        onDeletePage={setPageToDelete}
        onNavigate={handleNavigate}
        pages={pages}
        activeKey={activeKey}
        publishesStore={publishesStore}
        allowAdvancedBuilder={plan.advancedBuilder}
        maxCustomSections={plan.maxCustomSections}
      />

      <CreatePageDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreatePage} />
      <ConfirmDialog
        open={pageToDelete !== null}
        title={`Supprimer « ${pageToDelete?.title ?? ''} » ?`}
        description="Cette action est irréversible. La page et son contenu seront définitivement supprimés."
        confirmLabel="Supprimer"
        pendingLabel="Suppression…"
        pending={false}
        tone="danger"
        onConfirm={handleDeletePage}
        onClose={() => setPageToDelete(null)}
      />
    </>
  )
}

/* ─────────────────── Builder editor (per context) ────────────────── */

function BuilderEditor({
  shop,
  removableBranding,
  target,
  label,
  previewPath,
  previewTemplateKey,
  availableTypes,
  draftBadge,
  hasStoredDraft,
  onContextChange,
  onCreatePage,
  onDeletePage,
  onNavigate,
  pages,
  activeKey,
  publishesStore,
  allowAdvancedBuilder,
  maxCustomSections,
}: {
  shop: Shop
  removableBranding: boolean
  target: BuilderTarget
  label: string
  previewPath: string | null
  previewTemplateKey?: SystemTemplateKey
  availableTypes?: SectionType[]
  draftBadge: boolean
  hasStoredDraft: boolean
  onContextChange: (key: ActiveKey) => void
  onCreatePage: () => void
  onDeletePage: (page: StorePage) => void
  onNavigate: (path: string) => void
  pages: StorePage[]
  activeKey: ActiveKey
  publishesStore: boolean
  allowAdvancedBuilder: boolean
  maxCustomSections: number | null
}) {
  const builder = useBuilderState(target)
  const toast = useToast()
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false)
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false)
  const [applyConfirmOpen, setApplyConfirmOpen] = useState(false)
  const canDiscard = builder.dirty || hasStoredDraft

  // Previewing a candidate style (Styles tab): shows it live in the same
  // iframe, with the shop's real data, without writing anything — only
  // "Appliquer ce style" below commits it as a draft. Scoped to the Styles
  // tab — dropped the moment the merchant leaves it, adjusted during render
  // (this codebase's pattern for resetting state when a prop/value changes)
  // rather than in an effect, so "Blocs"/"Thème" never flash the previewed
  // template before the reset commits.
  const [previewTemplate, setPreviewTemplate] = useState<StoreTemplate | null>(null)
  const [lastActiveTab, setLastActiveTab] = useState(builder.activeTab)
  if (builder.activeTab !== lastActiveTab) {
    setLastActiveTab(builder.activeTab)
    if (previewTemplate) setPreviewTemplate(null)
  }

  const previewSections = previewTemplate
    ? (target.templateSections?.(previewTemplate, builder.sections) ?? previewTemplate.layout.home)
    : builder.sections
  const previewThemeColor = previewTemplate ? previewTemplate.themeColor : builder.themeColor
  const previewThemeConfig = previewTemplate ? previewTemplate.themeConfig : builder.themeConfig

  const handleRemoveSection = (id: string) => {
    builder.removeSection(id)
    toast.info('Section supprimée — Ctrl+Z pour annuler.')
  }

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

  /* Warn before closing/refreshing the tab with unsaved changes — React
   * Router navigation isn't covered (would need a data router with a
   * navigation blocker), only actual tab-close/refresh/URL changes. */
  useEffect(() => {
    if (!builder.dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [builder.dirty])

  const previewUrl = previewPath ? storefrontUrl(shop.slug, previewPath) : null

  const handlePreview = async () => {
    if (!previewUrl) return
    await builder.saveDraftMutation.mutateAsync()
    window.open(`${previewUrl}${previewUrl.includes('?') ? '&' : '?'}preview=draft`, '_blank')
  }

  return (
    <div className="flex h-full flex-col">
      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <PageSwitcher
            activeKey={activeKey}
            pages={pages}
            onSelect={onContextChange}
            onCreatePage={onCreatePage}
            onDeletePage={onDeletePage}
          />

          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
              <Wand2 size={20} className="text-brand-600" aria-hidden />
              {label}
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${builder.dirty ? 'bg-amber-400' : 'bg-emerald-500'}`} aria-hidden />
              {builder.dirty ? 'Modifications non enregistrées' : 'Tout est enregistré'}
              {draftBadge && (
                <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Brouillon</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center overflow-hidden rounded-lg border border-gray-200">
            <button type="button" onClick={builder.undo} disabled={!builder.canUndo} title="Annuler (Ctrl+Z)" aria-label="Annuler" className="px-2.5 py-2 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
              <Undo2 size={16} aria-hidden />
            </button>
            <button type="button" onClick={builder.redo} disabled={!builder.canRedo} title="Rétablir (Ctrl+Y)" aria-label="Rétablir" className="border-l border-gray-200 px-2.5 py-2 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
              <Redo2 size={16} aria-hidden />
            </button>
          </div>
          <span className="mx-1 hidden text-xs text-gray-400 lg:block">Cliquez sur un bloc dans l'aperçu pour le modifier.</span>
          <button
            type="button"
            onClick={() => setDiscardConfirmOpen(true)}
            disabled={!canDiscard || builder.discardMutation.isPending}
            title="Revenir à la version publiée"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {builder.discardMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} aria-hidden />}
            Annuler les modifications
          </button>
          <button type="button" onClick={handlePreview} disabled={builder.saveDraftMutation.isPending || !previewUrl} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            <ExternalLink size={14} aria-hidden /> Prévisualiser
          </button>
          <button type="button" onClick={() => builder.saveDraftMutation.mutate(undefined, { onSuccess: () => toast.success('Brouillon enregistré.') })} disabled={builder.saveDraftMutation.isPending} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            {builder.saveDraftMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : builder.saveDraftMutation.isSuccess && !builder.dirty ? <Check size={14} className="text-emerald-600" /> : null}
            Enregistrer
          </button>
          <button type="button" onClick={() => setPublishConfirmOpen(true)} disabled={builder.publishMutation.isPending} className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-brand-900/10 transition-colors hover:bg-brand-700 disabled:opacity-60">
            {builder.publishMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            Publier
          </button>
        </div>
      </div>

      {/* ── 3-column layout ─────────────────────────────────── */}
      <div className="grid min-h-[600px] flex-1 grid-cols-[16rem_minmax(0,1fr)_20rem] grid-rows-[minmax(0,1fr)] overflow-hidden rounded-xl border border-gray-200">
        <BuilderSidebar
          sections={builder.sections}
          selectedSectionId={builder.selectedSectionId}
          activeTab={builder.activeTab}
          onTabChange={builder.setActiveTab}
          onSelect={builder.selectSection}
          onToggleVisible={builder.toggleVisible}
          onRemove={handleRemoveSection}
          onDuplicate={builder.duplicateSection}
          onReorder={builder.reorderSection}
          onAdd={builder.addSection}
          availableTypes={availableTypes}
          templateId={shop.template_id}
          allowTemplates={allowAdvancedBuilder}
          maxCustomSections={maxCustomSections}
        />

        {previewPath && previewUrl ? (
          <div className="flex min-w-0 flex-col">
            {previewTemplate && (
              <div className="flex items-center justify-between gap-3 border-b border-brand-200 bg-brand-50 px-4 py-2.5">
                <p className="text-sm font-medium text-brand-800">
                  Aperçu avec vos données : <span className="font-semibold">{previewTemplate.label}</span>
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewTemplate(null)}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-100"
                  >
                    Annuler l'aperçu
                  </button>
                  <button
                    type="button"
                    onClick={() => setApplyConfirmOpen(true)}
                    className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
                  >
                    Appliquer ce style
                  </button>
                </div>
              </div>
            )}
            <div className="min-h-0 flex-1">
              <BuilderPreviewFrame
                slug={shop.slug}
                pagePath={previewPath}
                templateKey={previewTemplateKey}
                sections={previewSections}
                themeColor={previewThemeColor}
                themeConfig={previewThemeConfig}
                onSelectSection={previewTemplate ? () => {} : builder.selectSection}
                onNavigate={onNavigate}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 bg-gray-50 p-8 text-center">
            <p className="text-sm font-medium text-gray-700">Aucun produit actif pour prévisualiser la fiche produit.</p>
            <p className="text-xs text-gray-500">Ajoutez un produit : l'aperçu affichera la fiche produit.</p>
            <Link to="/admin/produits" className="mt-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
              Gérer les produits
            </Link>
          </div>
        )}

        <div className="overflow-y-auto border-l border-gray-200 bg-white p-4">
          {builder.activeTab === 'blocks' && (
            <SectionEditorPanel
              section={builder.selectedSection}
              shopId={shop.id}
              templateId={shop.template_id}
              removableBranding={removableBranding}
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
          {builder.activeTab === 'templates' && (
            <TemplateLibraryPanel shop={shop} previewingKey={previewTemplate?.key ?? null} onPreview={setPreviewTemplate} />
          )}
        </div>
      </div>

      {/* ── Dialogs ─────────────────────────────────────────── */}
      <ConfirmDialog
        open={publishConfirmOpen}
        title={publishesStore ? "Publier le design de toute la boutique ?" : 'Publier cette page ?'}
        description={
          publishesStore
            ? 'Le thème et la mise en page de l’accueil, du catalogue, de la fiche produit, du panier et de la commande seront publiés et immédiatement visibles par vos clients.'
            : 'Le contenu de cette page sera immédiatement visible par vos clients.'
        }
        confirmLabel="Publier"
        pendingLabel="Publication…"
        pending={builder.publishMutation.isPending}
        tone="default"
        onConfirm={() =>
          builder.publishMutation.mutate(undefined, {
            onSuccess: () => {
              setPublishConfirmOpen(false)
              toast.success(publishesStore ? 'Design publié. Il est en ligne.' : 'Page publiée.')
            },
            onError: () => toast.error('La publication a échoué. Réessayez.'),
          })
        }
        onClose={() => setPublishConfirmOpen(false)}
      />
      <ConfirmDialog
        open={discardConfirmOpen}
        title="Annuler les modifications ?"
        description="Cette page reviendra à ce qui est actuellement publié en ligne. Les modifications non publiées seront perdues — cette action est irréversible."
        confirmLabel="Annuler les modifications"
        pendingLabel="Annulation…"
        pending={builder.discardMutation.isPending}
        tone="danger"
        onConfirm={() =>
          builder.discardMutation.mutate(undefined, {
            onSuccess: () => {
              setDiscardConfirmOpen(false)
              toast.info('Modifications annulées.')
            },
            onError: () => toast.error("Impossible d'annuler les modifications."),
          })
        }
        onClose={() => setDiscardConfirmOpen(false)}
      />
      <ConfirmDialog
        open={applyConfirmOpen}
        title="Appliquer ce style à toute la boutique ?"
        description={
          previewTemplate
            ? `Le design complet de votre boutique (accueil, catalogue, fiche produit, panier et commande) sera remplacé par "${previewTemplate.label}" en brouillon. Vos produits, catégories, commandes et informations restent inchangés — prévisualisez, puis publiez quand vous êtes prêt·e.`
            : ''
        }
        confirmLabel="Appliquer"
        tone="default"
        onConfirm={() => {
          if (previewTemplate) builder.applyTemplate(previewTemplate)
          setApplyConfirmOpen(false)
          setPreviewTemplate(null)
        }}
        onClose={() => setApplyConfirmOpen(false)}
      />
    </div>
  )
}

/* ─────────────────────── Create page dialog ─────────────────── */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
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
    <Dialog
      open={open}
      onClose={onClose}
      title="Nouvelle page"
      size="md"
      footer={
        <div className="flex justify-end gap-2">
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
      }
    >
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
    </Dialog>
  )
}
