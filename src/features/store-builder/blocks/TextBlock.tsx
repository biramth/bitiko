import type { FlexibleTextBlock } from '@/types/builder'
import { editorHelpClass, editorInputClass, editorLabelClass } from '../sections/shared'
import type { BlockEditorProps, BlockRendererProps } from '../blockRegistry'
import { InlineText } from '../inline/InlineText'
import { InlineStyleToolbar } from '../inline/InlineStyleToolbar'
import { TextStyleField } from '../components/TextStyleControls'
import { resolveTextStyle } from '@/config/textStyle'

export function TextBlockRenderer({ block, editable = false, onChange }: BlockRendererProps<FlexibleTextBlock>) {
  if (!editable && !block.heading.trim() && !block.body.trim()) return null
  const align = block.align === 'center' ? 'text-center mx-auto' : 'text-left'
  return (
    <div className={`max-w-2xl ${align}`}>
      {(block.heading.trim() || editable) && (
        <InlineStyleToolbar editable={editable} style={block.headingStyle} onCommit={(headingStyle) => onChange?.({ ...block, headingStyle })} label="Style du titre">
          <InlineText
            as="h3"
            editable={editable}
            value={block.heading}
            onCommit={(heading) => onChange?.({ ...block, heading })}
            placeholder="Titre (optionnel)"
            className="font-bold text-[var(--shop-text)]"
            style={{ fontFamily: 'var(--shop-font-heading)', ...resolveTextStyle(block.headingStyle) }}
            label="Titre"
          />
        </InlineStyleToolbar>
      )}
      {(block.body.trim() || editable) && (
        <InlineStyleToolbar editable={editable} style={block.bodyStyle} onCommit={(bodyStyle) => onChange?.({ ...block, bodyStyle })} label="Style du texte">
          <InlineText
            as="p"
            editable={editable}
            value={block.body}
            onCommit={(body) => onChange?.({ ...block, body })}
            placeholder="Texte"
            className="mt-2 whitespace-pre-line text-[var(--shop-text)]/70"
            style={resolveTextStyle(block.bodyStyle)}
            multiline
            label="Texte"
          />
        </InlineStyleToolbar>
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
        <p className={`mt-1 ${editorHelpClass}`}>Vide = aucun titre affiché.</p>
        <TextStyleField value={block.headingStyle} onChange={(headingStyle) => onChange({ ...block, headingStyle })} />
      </div>
      <div>
        <label className={editorLabelClass}>Texte</label>
        <textarea rows={3} value={block.body} onChange={(e) => onChange({ ...block, body: e.target.value })} className={editorInputClass} />
        <TextStyleField value={block.bodyStyle} onChange={(bodyStyle) => onChange({ ...block, bodyStyle })} />
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
