import { MousePointerClick } from 'lucide-react'
import { SECTION_REGISTRY } from './sectionRegistry'
import type { LayoutSection } from '@/types/builder'

export function SectionEditorPanel({
  section,
  shopId,
  removableBranding,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange,
}: {
  section: LayoutSection | null
  shopId: string
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
            Cliquez sur un bloc dans la liste à gauche, ou directement dans l'aperçu, pour le personnaliser.
          </p>
        </div>
      </div>
    )
  }

  const def = SECTION_REGISTRY[section.type]
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
      <Editor config={section.config} onChange={onChange} shopId={shopId} sectionId={section.id} removableBranding={removableBranding} />
    </div>
  )
}
