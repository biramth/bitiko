import type { FlexibleSpacerBlock } from '@/types/builder'
import { editorLabelClass } from '../sections/shared'
import type { BlockEditorProps } from '../blockRegistry'

const HEIGHT_CLASS: Record<FlexibleSpacerBlock['height'], string> = {
  sm: 'h-4',
  md: 'h-10',
  lg: 'h-20',
}

export function SpacerBlockRenderer({ block }: { block: FlexibleSpacerBlock }) {
  return <div className={HEIGHT_CLASS[block.height]} aria-hidden />
}

export function SpacerBlockEditor({ block, onChange }: BlockEditorProps<FlexibleSpacerBlock>) {
  return (
    <div>
      <label className={editorLabelClass}>Hauteur</label>
      <select
        value={block.height}
        onChange={(e) => onChange({ ...block, height: e.target.value as FlexibleSpacerBlock['height'] })}
        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-400 focus:outline-none"
      >
        <option value="sm">Petite</option>
        <option value="md">Moyenne</option>
        <option value="lg">Grande</option>
      </select>
    </div>
  )
}
