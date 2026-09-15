import { Link } from 'react-router-dom'
import { Check, ExternalLink, Loader2, Lock, Wand2 } from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { useShopPlan } from '@/features/billing/useShopPlan'
import { useBuilderState } from '@/features/store-builder/useBuilderState'
import { BuilderSidebar } from '@/features/store-builder/BuilderSidebar'
import { BuilderPreviewFrame } from '@/features/store-builder/BuilderPreviewFrame'
import { SectionEditorPanel } from '@/features/store-builder/SectionEditorPanel'
import { ThemeEditorPanel } from '@/features/store-builder/ThemeEditorPanel'
import { TemplateLibraryPanel } from '@/features/store-builder/TemplateLibraryPanel'
import { shopUrl } from '@/lib/tenant'
import { Spinner } from '@/components/ui/Spinner'
import { usePageSeo } from '@/hooks/usePageSeo'
import type { Shop } from '@/types'

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

function StoreBuilder({ shop }: { shop: Shop }) {
  const builder = useBuilderState(shop)

  const handlePreview = async () => {
    await builder.saveDraftMutation.mutateAsync()
    const url = shopUrl(shop.slug)
    window.open(`${url}${url.includes('?') ? '&' : '?'}preview=draft`, '_blank')
  }

  const handlePublish = () => {
    if (confirm('Publier ces changements ? Ils seront immédiatement visibles par vos clients.')) {
      builder.publishMutation.mutate()
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
            <Wand2 size={20} className="text-brand-600" aria-hidden />
            Personnaliser ma boutique
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {builder.dirty ? 'Modifications non enregistrées.' : 'Tout est enregistré.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePreview}
            disabled={builder.saveDraftMutation.isPending}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <ExternalLink size={14} aria-hidden /> Prévisualiser
          </button>
          <button
            type="button"
            onClick={() => builder.saveDraftMutation.mutate()}
            disabled={builder.saveDraftMutation.isPending}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {builder.saveDraftMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : builder.saveDraftMutation.isSuccess && !builder.dirty ? (
              <Check size={14} className="text-emerald-600" />
            ) : null}
            Enregistrer
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={builder.publishMutation.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {builder.publishMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            Publier
          </button>
        </div>
      </div>

      <div className="grid h-[75vh] min-h-[600px] grid-cols-[16rem_1fr_20rem] overflow-hidden rounded-xl border border-gray-200">
        <BuilderSidebar
          sections={builder.sections}
          selectedSectionId={builder.selectedSectionId}
          activeTab={builder.activeTab}
          onTabChange={builder.setActiveTab}
          onSelect={builder.selectSection}
          onToggleVisible={builder.toggleVisible}
          onRemove={builder.removeSection}
          onReorder={builder.reorderSection}
          onAdd={builder.addSection}
        />

        <BuilderPreviewFrame
          slug={shop.slug}
          sections={builder.sections}
          themeColor={builder.themeColor}
          themeConfig={builder.themeConfig}
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
    </div>
  )
}
