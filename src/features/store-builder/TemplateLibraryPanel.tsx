import { useState } from 'react'
import { Link } from 'react-router-dom'
import { templatesForVertical } from '@/config/storeTemplates'
import { VERTICAL_BY_KEY } from '@/config/verticals'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { Shop } from '@/types'
import type { StoreTemplate } from '@/types/builder'

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

export function TemplateLibraryPanel({
  shop,
  onApply,
}: {
  shop: Pick<Shop, 'business_type' | 'template_id'>
  onApply: (template: StoreTemplate) => void
}) {
  const [pendingTemplate, setPendingTemplate] = useState<StoreTemplate | null>(null)
  const templates = templatesForVertical(shop.business_type)
  const vertical = shop.business_type ? VERTICAL_BY_KEY[shop.business_type] : undefined

  return (
    <div>
      <p className="mb-1 text-sm text-gray-500">
        Un style redessine toute votre boutique d'un coup : couleurs, typographie et mise en page de l'accueil, du
        catalogue, de la fiche produit, du panier et de la commande — vos pages personnalisées ne sont pas touchées.
        Il est appliqué en brouillon — prévisualisez, puis publiez. Vos réglages précis restent modifiables ensuite
        dans l'onglet Thème.
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
          return (
            <button
              key={template.key}
              type="button"
              onClick={() => setPendingTemplate(template)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left hover:border-brand-300 hover:bg-brand-50/40 ${
                isCurrent ? 'border-brand-300 bg-brand-50/40' : 'border-gray-200'
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
                </span>
                <span className="block text-xs text-gray-500">{template.description}</span>
              </span>
            </button>
          )
        })}
      </div>

      <ConfirmDialog
        open={pendingTemplate !== null}
        title="Appliquer ce style à toute la boutique ?"
        description={
          pendingTemplate
            ? `Le design complet de votre boutique (accueil, catalogue, fiche produit, panier et commande) sera remplacé par "${pendingTemplate.label}" en brouillon. Prévisualisez d'abord, puis publiez.`
            : ''
        }
        confirmLabel="Appliquer"
        tone="default"
        onConfirm={() => {
          if (pendingTemplate) onApply(pendingTemplate)
          setPendingTemplate(null)
        }}
        onClose={() => setPendingTemplate(null)}
      />
    </div>
  )
}
