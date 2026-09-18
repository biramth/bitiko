import { createContext, useContext, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'

/** Whether this storefront load started inside the builder's live-preview
 *  iframe (`?preview=draft`). Captured once (lazy initial state) from the
 *  URL that mounted `DraftPreviewProvider` — never re-derived from the
 *  router's current search params — because a click-through inside the
 *  preview (e.g. the Hero's "Découvrir la boutique" button) navigates via a
 *  plain relative `<Link to="/catalogue">`, which drops the `?preview=draft`
 *  query string entirely. Without this, every "suivre la page"/inline-edit/
 *  click-to-select affordance would silently turn itself off the moment the
 *  merchant clicked any link inside the preview. */
const DraftPreviewContext = createContext<boolean | null>(null)

export function DraftPreviewProvider({ children }: { children: ReactNode }) {
  const [searchParams] = useSearchParams()
  const [isDraftPreview] = useState(() => searchParams.get('preview') === 'draft')
  return <DraftPreviewContext.Provider value={isDraftPreview}>{children}</DraftPreviewContext.Provider>
}

export function useIsDraftPreview(): boolean {
  const value = useContext(DraftPreviewContext)
  if (value === null) throw new Error('useIsDraftPreview must be used within a DraftPreviewProvider')
  return value
}

/** True inside the builder's live-preview iframe (`?preview=draft` + iframe),
 *  signalling that block interactions should select/switch blocks instead of
 *  navigating the browser, and that demo cart/checkout content should be
 *  seeded when the real cart is empty. */
export function useIsEmbeddedPreview(): boolean {
  const isDraftPreview = useIsDraftPreview()
  return isDraftPreview && typeof window !== 'undefined' && window.parent !== window
}
