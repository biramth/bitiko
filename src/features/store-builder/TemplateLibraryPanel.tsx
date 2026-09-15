import { useState } from 'react'
import { STORE_TEMPLATES } from '@/config/storeTemplates'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
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

export function TemplateLibraryPanel({ onApply }: { onApply: (template: StoreTemplate) => void }) {
  const [pendingTemplate, setPendingTemplate] = useState<StoreTemplate | null>(null)

  return (
    <div>
      <p className="mb-4 text-sm text-gray-500">
        Un style redessine toute votre boutique d'un coup : couleurs, typographie et mise en page de l'accueil, du
        catalogue, de la fiche produit, du panier et de la commande. Il est appliqué en brouillon — prévisualisez,
        puis publiez. Vos réglages précis restent modifiables ensuite dans l'onglet Thème.
      </p>
      <div className="space-y-3">
        {STORE_TEMPLATES.map((template) => (
          <button
            key={template.key}
            type="button"
            onClick={() => setPendingTemplate(template)}
            className="flex w-full items-center gap-3 rounded-xl border border-gray-200 p-3 text-left hover:border-brand-300 hover:bg-brand-50/40"
          >
            <TemplateThumbnail template={template} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-gray-900">{template.label}</span>
              <span className="block text-xs text-gray-500">{template.description}</span>
            </span>
          </button>
        ))}
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
