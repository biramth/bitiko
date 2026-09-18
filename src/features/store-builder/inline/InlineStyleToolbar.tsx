import { useEffect, useRef, useState } from 'react'
import { Type } from 'lucide-react'
import type { TextStyleOverride } from '@/types/builder'
import { hasTextStyle } from '@/config/textStyle'
import { TextStyleControls } from '../components/TextStyleControls'

/** Resets inherited storefront typography inside the popover, which is
 *  rendered inside the text's own (themed) subtree. */
const POPOVER_RESET: React.CSSProperties = {
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  fontWeight: 400,
  fontStyle: 'normal',
  color: '#111827',
  textTransform: 'none',
  letterSpacing: 'normal',
  textAlign: 'left',
}

/** Wraps an `InlineText` so its color/font/weight can be restyled right in the
 *  live preview: a small "Aa" trigger appears on hover and opens a popover with
 *  the same `TextStyleControls` the sidebar uses. Every change is committed
 *  immediately (the preview updates as you pick), like the sidebar's own
 *  controls. Renders `children` untouched when not editable, so the real
 *  storefront never pays for it. */
export function InlineStyleToolbar({
  style,
  onCommit,
  editable,
  children,
  label = 'Style du texte',
  display = 'block',
  corner = 'top-left',
}: {
  style: TextStyleOverride | undefined
  onCommit: (style: TextStyleOverride | undefined) => void
  editable: boolean
  children: React.ReactNode
  label?: string
  /** `inline` for button labels / inline runs, `block` for headings & paragraphs. */
  display?: 'block' | 'inline'
  /** Where the trigger sits — `bottom-right` when a link popover already
   *  occupies the top-right corner of the same element. */
  corner?: 'top-left' | 'bottom-right'
}) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onOutside = (e: MouseEvent) => {
      if (!anchorRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onOutside)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!editable) return <>{children}</>

  const active = hasTextStyle(style)
  const triggerPos = corner === 'bottom-right' ? '-bottom-2 -right-2' : '-left-2 -top-2'

  return (
    <div
      ref={anchorRef}
      className={`group/style relative ${display === 'inline' ? 'inline-flex' : 'block'}`}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
      <button
        type="button"
        title={label}
        aria-label={label}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className={`absolute ${triggerPos} z-30 flex h-5 w-5 items-center justify-center rounded-full border border-white text-white shadow transition-opacity hover:opacity-100 group-hover/style:opacity-100 ${
          open || active ? 'opacity-100' : 'opacity-0'
        } ${active ? 'bg-gray-900' : 'bg-brand-600'}`}
      >
        <Type size={11} aria-hidden />
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute left-0 top-full z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
          style={POPOVER_RESET}
        >
          <p className="mb-2 text-xs font-semibold text-gray-700">{label}</p>
          <TextStyleControls value={style} onChange={onCommit} />
        </div>
      )}
    </div>
  )
}
