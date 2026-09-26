/** Mobile-only UI states a step needs before its target is on screen (the nav
 *  drawer, the builder's Blocs/Aperçu/Réglages panes). Broadcast as a
 *  `bitiko:tour-prepare` event — listeners ignore it on desktop layouts. */
export type TourPrepare =
  | 'admin-menu-open'
  | 'admin-menu-closed'
  | 'builder-tab:blocks'
  | 'builder-tab:preview'
  | 'builder-tab:settings'

export const TOUR_PREPARE_EVENT = 'bitiko:tour-prepare'

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
  /** See `TourPrepare` — run before this step is shown. */
  prepare?: TourPrepare
  /** Capability HAS_* requise : l'étape est retirée pour un métier qui ne
   *  l'a pas (ex. pas de « Commandes » pour un salon). Inconnue = conservée. */
  capability?: string
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