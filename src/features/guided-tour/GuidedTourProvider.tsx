import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { TOUR_PREPARE_EVENT, type GuidedTour, type TourPrepare } from './types'
import { GUIDED_TOUR_BY_ID } from './tours'
import { isTourSeen, markTourSeen } from './storage'
import { GuidedTourContext, type GuidedTourContextValue } from './useGuidedTour'
import { TourOverlay } from './TourOverlay'

/** Cleans the ?tour=<id> launch parameter (from onboarding) out of the URL so
 *  a refresh doesn't replay the tour. */
function removeTourParam(): void {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('tour')) return
  url.searchParams.delete('tour')
  window.history.replaceState(null, '', url.toString())
}

function broadcastPrepare(prepare: TourPrepare) {
  window.dispatchEvent(new CustomEvent(TOUR_PREPARE_EVENT, { detail: prepare }))
}

export function GuidedTourProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTour, setActiveTour] = useState<GuidedTour | null>(null)
  const [activeTourId, setActiveTourId] = useState<string | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const launchTimerRef = useRef<number | null>(null)

  const stopTour = useCallback(() => {
    if (launchTimerRef.current !== null) {
      window.clearTimeout(launchTimerRef.current)
      launchTimerRef.current = null
    }
    setActiveTour(null)
    setActiveTourId(null)
    setStepIndex(0)
    broadcastPrepare('admin-menu-closed')
  }, [])

  const begin = useCallback((id: string) => {
    const tour = GUIDED_TOUR_BY_ID[id]
    if (!tour) return
    setActiveTourId(id)
    setActiveTour(tour)
    setStepIndex(0)
    markTourSeen(id)
    removeTourParam()
  }, [])

  const startGuidedTour = useCallback(
    (id: string) => {
      const tour = GUIDED_TOUR_BY_ID[id]
      if (!tour) return
      const onPage = tour.pages.some((page) => location.pathname.startsWith(page))
      if (onPage) {
        begin(id)
        return
      }
      if (launchTimerRef.current !== null) window.clearTimeout(launchTimerRef.current)
      navigate(tour.pages[0])
      launchTimerRef.current = window.setTimeout(() => begin(id), 450)
    },
    [location.pathname, navigate, begin],
  )

  // Onboarding navigates to /admin?tour=welcome right after creating the
  // store — start that tour once (it marks itself as seen immediately).
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('tour')
    if (!id || !GUIDED_TOUR_BY_ID[id] || isTourSeen(id)) return
    const timer = window.setTimeout(() => begin(id), 700)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, begin])

  // Steps can need a mobile-only UI state first (nav drawer open, builder pane).
  const currentPrepare = activeTour?.steps[stepIndex]?.prepare
  useEffect(() => {
    if (currentPrepare) broadcastPrepare(currentPrepare)
  }, [currentPrepare, stepIndex, activeTour])

  // The tour only makes sense on its own pages — leave and it stops.
  useEffect(() => {
    if (!activeTour) return
    if (!activeTour.pages.some((page) => location.pathname.startsWith(page))) stopTour()
  }, [location.pathname, activeTour, stopTour])

  // Keyboard controls while a tour is live: Esc quits, ← → stepper.
  useEffect(() => {
    if (!activeTour) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        stopTour()
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setStepIndex((index) => Math.min(index + 1, activeTour.steps.length - 1))
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setStepIndex((index) => Math.max(index - 1, 0))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeTour, stopTour])

  const next = useCallback(() => {
    setStepIndex((index) => Math.min(index + 1, (activeTour?.steps.length ?? 1) - 1))
  }, [activeTour])
  const prev = useCallback(() => {
    setStepIndex((index) => Math.max(index - 1, 0))
  }, [])

  const value = useMemo<GuidedTourContextValue>(
    () => ({ startGuidedTour, activeTourId }),
    [startGuidedTour, activeTourId],
  )

  return (
    <GuidedTourContext.Provider value={value}>
      {children}
      {!!activeTour && (
        <TourOverlay tour={activeTour} stepIndex={stepIndex} onPrev={prev} onNext={next} onClose={stopTour} />
      )}
    </GuidedTourContext.Provider>
  )
}