import { createContext, useContext } from 'react'

export interface GuidedTourContextValue {
  startGuidedTour: (id: string) => void
  activeTourId: string | null
}

/** Shared context for the guided-tour feature. Lives in its own,
 *  components-free module (with the `useGuidedTour` hook) so the provider
 *  file stays components-only (React fast-refresh rule). */
export const GuidedTourContext = createContext<GuidedTourContextValue | null>(null)

export function useGuidedTour(): GuidedTourContextValue {
  const context = useContext(GuidedTourContext)
  if (!context) throw new Error('useGuidedTour doit être utilisé dans GuidedTourProvider')
  return context
}
