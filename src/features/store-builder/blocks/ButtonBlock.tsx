import { Link } from 'react-router-dom'
import type { FlexibleButtonBlock } from '@/types/builder'
import { editorInputClass, editorLabelClass } from '../sections/shared'
import type { BlockEditorProps, BlockRendererProps } from '../blockRegistry'
import { InlineText } from '../inline/InlineText'
import { InlineLinkPopover } from '../inline/InlineLinkPopover'
import { InlineStyleToolbar } from '../inline/InlineStyleToolbar'
import { TextStyleField } from '../components/TextStyleControls'
import { resolveTextStyle } from '@/config/textStyle'

function isExternalUrl(url: string) {
  return /^https?:\/\//i.test(url)
}

export function ButtonBlockRenderer({ block, editable = false, onChange }: BlockRendererProps<FlexibleButtonBlock>) {
  if (!block.label.trim() && !editable) return null
  const className =
    block.style === 'outline'
      ? 'inline-flex items-center gap-2 border border-[var(--shop-text)]/20 px-5 py-3 text-sm font-semibold text-[var(--shop-text)] transition-colors hover:border-[var(--shop-text)]/50'
      : 'inline-flex items-center gap-2 bg-[var(--shop-button)] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90'
  const style = { borderRadius: 'var(--shop-radius)' }
  const url = block.url.trim() || '/catalogue'
  const labelStyle = resolveTextStyle(block.labelStyle)
  const label = (
    <InlineStyleToolbar editable={editable} display="inline" style={block.labelStyle} onCommit={(labelStyle) => onChange?.({ ...block, labelStyle })} label="Style du bouton">
      <InlineText
        editable={editable}
        value={block.label}
        onCommit={(value) => onChange?.({ ...block, label: value })}
        placeholder="Voir l'offre"
        style={labelStyle}
        label="Texte du bouton"
      />
    </InlineStyleToolbar>
  )

  if (editable) {
    return (
      <InlineLinkPopover url={block.url} onCommit={(newUrl) => onChange?.({ ...block, url: newUrl })} editable>
        <span style={style} className={className}>
          {label}
        </span>
      </InlineLinkPopover>
    )
  }

  return isExternalUrl(url) ? (
    <a href={url} target="_blank" rel="noreferrer" style={{ ...style, ...labelStyle }} className={className}>
      {block.label}
    </a>
  ) : (
    <Link to={url} style={{ ...style, ...labelStyle }} className={className}>
      {block.label}
    </Link>
  )
}

export function ButtonBlockEditor({ block, onChange }: BlockEditorProps<FlexibleButtonBlock>) {
  return (
    <div className="space-y-3">
      <div>
        <label className={editorLabelClass}>Texte du bouton</label>
        <input
          value={block.label}
          onChange={(e) => onChange({ ...block, label: e.target.value })}
          placeholder="Voir l'offre"
          className={editorInputClass}
        />
        <TextStyleField value={block.labelStyle} onChange={(labelStyle) => onChange({ ...block, labelStyle })} />
      </div>
      <div>
        <label className={editorLabelClass}>Lien</label>
        <input
          value={block.url}
          onChange={(e) => onChange({ ...block, url: e.target.value })}
          placeholder="/catalogue"
          className={editorInputClass}
        />
      </div>
      <div>
        <label className={editorLabelClass}>Style</label>
        <select
          value={block.style}
          onChange={(e) => onChange({ ...block, style: e.target.value as FlexibleButtonBlock['style'] })}
          className={editorInputClass}
        >
          <option value="solid">Plein</option>
          <option value="outline">Contour</option>
        </select>
      </div>
    </div>
  )
}
