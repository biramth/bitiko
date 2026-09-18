import { useLayoutEffect, useRef } from 'react'

type EditableTag = 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div' | 'figcaption'

interface InlineTextProps {
  as?: EditableTag
  value: string
  onCommit: (value: string) => void
  editable: boolean
  className?: string
  style?: React.CSSProperties
  placeholder?: string
  multiline?: boolean
  label?: string
}

/** A heading/paragraph/label/button-label that becomes directly editable in
 *  place when `editable` (i.e. inside the builder's live preview — never on
 *  the real storefront, where it renders as a plain static tag).
 *
 *  Content is synced imperatively via `textContent` in a layout effect,
 *  never through React children, because contentEditable owns the DOM once
 *  focused and fights React's own child reconciliation over the same text
 *  node otherwise (the classic "contentEditable + React" pitfall). The
 *  effect skips syncing while this exact node is focused, so an external
 *  update (undo/redo, another field's change re-rendering this component)
 *  never clobbers what the merchant is mid-typing. */
export function InlineText({
  as: Tag = 'span',
  value,
  onCommit,
  editable,
  className,
  style,
  placeholder,
  multiline = false,
  label,
}: InlineTextProps) {
  const ref = useRef<HTMLElement | null>(null)
  const committedRef = useRef(value)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (document.activeElement === el) return
    if (el.textContent !== value) el.textContent = value
    committedRef.current = value
  })

  if (!editable) {
    return <Tag className={className} style={style}>{value || null}</Tag>
  }

  const commit = (el: HTMLElement) => {
    const text = (el.textContent ?? '').replace(/ /g, ' ')
    const normalized = multiline ? text : text.trim()
    if (normalized !== committedRef.current) {
      committedRef.current = normalized
      onCommit(normalized)
    }
  }

  return (
    <Tag
      ref={ref as unknown as React.Ref<never>}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={label}
      aria-multiline={multiline}
      data-placeholder={placeholder}
      className={`${className ?? ''} inline-editable`.trim()}
      style={style}
      onClick={(e) => {
        // Stop the section-select handler from firing, and block the
        // default action so editing a button/link's label doesn't navigate
        // away — caret placement itself happens on mousedown, before this,
        // so it isn't affected by preventDefault here.
        e.stopPropagation()
        e.preventDefault()
      }}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (!multiline && e.key === 'Enter') {
          e.preventDefault()
          e.currentTarget.blur()
        } else if (e.key === 'Escape') {
          e.currentTarget.textContent = committedRef.current
          e.currentTarget.blur()
        }
      }}
      onBlur={(e) => commit(e.currentTarget)}
      onPaste={(e) => {
        // Plain text only — a pasted <div>/<b> would otherwise leave stray
        // HTML inside a field meant to hold plain copy.
        e.preventDefault()
        document.execCommand('insertText', false, e.clipboardData.getData('text/plain'))
      }}
    />
  )
}
