/** A single coachmark inside a guided tour: an intro card (no `target`) or a
 *  highlight on a specific element of the admin (`target` selector). */
export interface TourStep {
  /** CSS selector of the element to ring + point at. Omit for a full-screen
   *  intro/outro card (no spotlight, no scroll). */
  target?: string
  title: string
  body: string
  /** Preferred tooltip side — falls back to whichever side actually fits. */
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

export interface GuidedTour {
  id: string
  /** Route prefixes the tour is relevant on. The help menu navigates to the
   *  first one before launching; the tour is dropped if it's left mid-way. */
  pages: string[]
  title: string
  /** Short description shown in the help menu. */
  description: string
  steps: TourStep[]
}