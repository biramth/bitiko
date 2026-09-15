import { MousePointerClick } from 'lucide-react'
import { SECTION_REGISTRY } from './sectionRegistry'
import type { LayoutSection } from '@/types/builder'

export function SectionEditorPanel({
  section,
  shopId,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange,
}: {
  section: LayoutSection | null
  shopId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (config: any) => void
}) {
  if (!section) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-gray-400">
        <MousePointerClick size={28} aria-hidden />
        <p className="text-sm">Sélectionnez un bloc à gauche pour le modifier.</p>
      </div>
    )
  }

  const def = SECTION_REGISTRY[section.type]
  const Editor = def.Editor

  return (
    <div>
      <h3 className="mb-4 font-heading text-base font-semibold text-gray-900">{def.label}</h3>
      <Editor config={section.config} onChange={onChange} shopId={shopId} sectionId={section.id} />
    </div>
  )
}
