import type { FlexibleSpacerBlock } from '@/types/builder'
import { editorLabelClass } from '../sections/shared'
import type { BlockEditorProps } from '../blockRegistry'
import { controlClass } from '@/components/ui/styles'

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
        className={`${controlClass()} mt-1`}
      >
        <option value="sm">Petite</option>
        <option value="md">Moyenne</option>
        <option value="lg">Grande</option>
      </select>
    </div>
  )
}
