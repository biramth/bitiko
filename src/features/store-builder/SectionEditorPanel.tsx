import { MousePointerClick } from 'lucide-react'
import { getEffectiveRegistry } from './effectiveRegistry'
import type { LayoutSection } from '@/types/builder'
import type { Shop } from '@/types'

export function SectionEditorPanel({
  section,
  shop,
  shopId,
  templateId,
  removableBranding,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange,
}: {
  section: LayoutSection | null
  shop: Shop
  shopId: string
  /** The shop's current template — resolves which section types (core plus
   *  whatever that template contributes) this panel knows how to edit. */
  templateId?: string | null
  removableBranding: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (config: any) => void
}) {
  if (!section) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-400">
          <MousePointerClick size={24} aria-hidden />
        </span>
        <div>
          <p className="text-sm font-medium text-gray-700">Aucun bloc sélectionné</p>
          <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-gray-400">
            Cliquez sur un bloc dans la liste des blocs, ou directement dans l'aperçu, pour le personnaliser.
          </p>
        </div>
      </div>
    )
  }

  const def = getEffectiveRegistry(templateId)[section.type]

  if (!def) {
    // A section type the shop's current template no longer offers (e.g. it
    // was added under a different template that has since been switched
    // away from). Nothing to edit — the merchant can only remove it, from
    // the sidebar's own controls.
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-500">
          <MousePointerClick size={24} aria-hidden />
        </span>
        <div>
          <p className="text-sm font-medium text-gray-700">Ce bloc n'est plus disponible</p>
          <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-gray-400">
            Il appartient à un autre style. Vous pouvez le supprimer depuis la liste des blocs.
          </p>
        </div>
      </div>
    )
  }

  const Editor = def.Editor
  const Icon = def.icon

  return (
    <div>
      <div className="mb-4 flex items-center gap-2.5">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm ${def.color}`}>
          <Icon size={16} aria-hidden />
        </span>
        <h3 className="font-heading text-base font-semibold text-gray-900">{def.label}</h3>
      </div>
      <Editor config={section.config} onChange={onChange} shop={shop} shopId={shopId} sectionId={section.id} removableBranding={removableBranding} />
    </div>
  )
}
