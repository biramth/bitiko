import type { FlexibleTextBlock } from '@/types/builder'
import { editorInputClass, editorLabelClass } from '../sections/shared'
import type { BlockEditorProps, BlockRendererProps } from '../blockRegistry'
import { InlineText } from '../inline/InlineText'

export function TextBlockRenderer({ block, editable = false, onChange }: BlockRendererProps<FlexibleTextBlock>) {
  if (!editable && !block.heading.trim() && !block.body.trim()) return null
  const align = block.align === 'center' ? 'text-center mx-auto' : 'text-left'
  return (
    <div className={`max-w-2xl ${align}`}>
      {(block.heading.trim() || editable) && (
        <InlineText
          as="h3"
          editable={editable}
          value={block.heading}
          onCommit={(heading) => onChange?.({ ...block, heading })}
          placeholder="Titre (optionnel)"
          className="font-bold text-[var(--shop-text)]"
          style={{ fontFamily: 'var(--shop-font-heading)' }}
          label="Titre"
        />
      )}
      {(block.body.trim() || editable) && (
        <InlineText
          as="p"
          editable={editable}
          value={block.body}
          onCommit={(body) => onChange?.({ ...block, body })}
          placeholder="Texte"
          className="mt-2 whitespace-pre-line text-[var(--shop-text)]/70"
          multiline
          label="Texte"
        />
      )}
    </div>
  )
}

export function TextBlockEditor({ block, onChange }: BlockEditorProps<FlexibleTextBlock>) {
  return (
    <div className="space-y-3">
      <div>
        <label className={editorLabelClass}>Titre (optionnel)</label>
        <input value={block.heading} onChange={(e) => onChange({ ...block, heading: e.target.value })} className={editorInputClass} />
      </div>
      <div>
        <label className={editorLabelClass}>Texte</label>
        <textarea rows={3} value={block.body} onChange={(e) => onChange({ ...block, body: e.target.value })} className={editorInputClass} />
      </div>
      <div>
        <label className={editorLabelClass}>Alignement</label>
        <select
          value={block.align}
          onChange={(e) => onChange({ ...block, align: e.target.value as FlexibleTextBlock['align'] })}
          className={editorInputClass}
        >
          <option value="left">Gauche</option>
          <option value="center">Centré</option>
        </select>
      </div>
    </div>
  )
}
