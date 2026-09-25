import { useEffect, useRef, useState } from 'react'
import { Link2 } from 'lucide-react'

/** Wraps a button/link so its destination URL can be edited directly in the
 *  live preview — a small pencil-like affordance appears on hover (the label
 *  itself is expected to be an `InlineText` sibling inside `children`, since
 *  a URL isn't visible text to click into) and opens a tiny popover with a
 *  single field. Renders `children` untouched when not editable. */
export function InlineLinkPopover({
  url,
  onCommit,
  editable,
  children,
  fieldLabel = 'Lien du bouton',
  placeholder = '/catalogue',
}: {
  url: string
  onCommit: (url: string) => void
  editable: boolean
  children: React.ReactNode
  fieldLabel?: string
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(url)
  // The draft tracks the committed URL: when the parent commits a new one
  // (after our own `onCommit`, or an undo), the field resets to it. Adjusted
  // during render (React's "adjust state when props change" pattern) rather
  // than in an effect, so no extra render pass is scheduled for the reset.
  const [draftFor, setDraftFor] = useState(url)
  if (url !== draftFor) {
    setDraftFor(url)
    setDraft(url)
  }
  const anchorRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const commitAndClose = () => {
      if (draft !== url) onCommit(draft)
      setOpen(false)
    }
    const onOutside = (e: MouseEvent) => {
      if (popoverRef.current?.contains(e.target as Node) || anchorRef.current?.contains(e.target as Node)) return
      commitAndClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDraft(url)
        setOpen(false)
      } else if (e.key === 'Enter') {
        commitAndClose()
      }
    }
    document.addEventListener('mousedown', onOutside)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onOutside)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, draft, url, onCommit])

  if (!editable) return <>{children}</>

  return (
    <div ref={anchorRef} className="group/link relative inline-flex" onClick={(e) => e.stopPropagation()}>
      {children}
      <button
        type="button"
        title={fieldLabel}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="absolute -right-2 -top-2 z-30 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-brand-600 text-white opacity-0 shadow transition-opacity group-hover/link:opacity-100 hover:opacity-100"
      >
        <Link2 size={11} aria-hidden />
      </button>
      {open && (
        <div
          ref={popoverRef}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute left-1/2 top-full z-40 mt-2 w-64 -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-3 text-left shadow-lg"
        >
          <label className="block text-xs font-medium text-gray-600">{fieldLabel}</label>
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs font-mono text-gray-900 focus:border-brand-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              onCommit(draft)
              setOpen(false)
            }}
            className="mt-2 w-full rounded-md bg-brand-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
          >
            OK
          </button>
        </div>
      )}
    </div>
  )
}
