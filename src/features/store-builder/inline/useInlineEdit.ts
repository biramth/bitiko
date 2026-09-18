import { useCallback } from 'react'
import { PREVIEW_INLINE_EDIT } from '../previewBridge'

/** Sends a shallow config patch for one section back to the parent builder
 *  window, from inside the live-preview iframe. Every Inline* component uses
 *  this so a direct edit made in the preview round-trips through the exact
 *  same `updateSectionConfig` path a sidebar Editor's `onChange` would use —
 *  inline editing is just another way to reach the same state update, not a
 *  parallel one, so undo/redo and the live PREVIEW_UPDATE echo keep working
 *  unchanged. */
export function useInlineEdit(sectionId: string | undefined) {
  return useCallback(
    (patch: Record<string, unknown>) => {
      if (!sectionId || typeof window === 'undefined') return
      window.parent?.postMessage({ type: PREVIEW_INLINE_EDIT, sectionId, patch }, '*')
    },
    [sectionId],
  )
}
