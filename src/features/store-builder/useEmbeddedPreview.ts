import { useSearchParams } from 'react-router-dom'

/** True inside the builder's live-preview iframe (`?preview=draft` + iframe),
 *  signalling that block interactions should select/switch blocks instead of
 *  navigating the browser, and that demo cart/checkout content should be
 *  seeded when the real cart is empty. */
export function useIsEmbeddedPreview(): boolean {
  const [searchParams] = useSearchParams()
  const isDraftPreview = searchParams.get('preview') === 'draft'
  return isDraftPreview && typeof window !== 'undefined' && window.parent !== window
}
