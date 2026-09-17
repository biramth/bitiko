import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import type { GuidedTour, TourStep } from './types'

interface HighlightRect {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
  key: string
}

/** Measures the highlighted element's viewport rect on every animation frame
 *  while a step has a target — this stays correct over the auto-scroll, nested
 *  scrollable containers (the admin sidebar) and window resizes. Only commits
 *  to state when the geometry actually changed. */
function useHighlightRect(selector: string | undefined, stepIndex: number): HighlightRect | null {
  const [rect, setRect] = useState<HighlightRect | null>(null)
  const prevRef = useRef<HighlightRect | null>(null)

  useEffect(() => {
    if (!selector) {
      prevRef.current = null
      setRect(null)
      return
    }
    let raf = 0
    const update = () => {
      const el = document.querySelector<HTMLElement>(selector)
      if (el) {
        const r = el.getBoundingClientRect()
        const key = `${r.left},${r.top},${r.width},${r.height}`
        const prev = prevRef.current
        if (!prev || prev.key !== key) {
          const next: HighlightRect = {
            left: r.left,
            top: r.top,
            right: r.right,
            bottom: r.bottom,
            width: r.width,
            height: r.height,
            key,
          }
          prevRef.current = next
          setRect(next)
        }
      }
      raf = requestAnimationFrame(update)
    }
    raf = requestAnimationFrame(update)
    return () => cancelAnimationFrame(raf)
  }, [selector, stepIndex])

  return rect
}

const GAP = 12
const EDGE = 16

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

/** Picks where the card fits (preferred side first, then any side that
 *  doesn't spill off-screen), clamped into the viewport as a last resort. */
function computePlacement(step: TourStep, target: HighlightRect, card: DOMRect): { left: number; top: number } {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const cw = Math.min(card.width, vw - EDGE * 2)
  const ch = card.height

  const fits = (left: number, top: number) =>
    left >= EDGE && top >= EDGE && left + cw <= vw - EDGE && top + ch <= vh - EDGE

  const horizontalCenter = clamp(target.left + target.width / 2 - cw / 2, EDGE, vw - cw - EDGE)
  const verticalCenter = clamp(target.top + target.height / 2 - ch / 2, EDGE, vh - ch - EDGE)

  const candidates: { left: number; top: number }[] = [
    { left: horizontalCenter, top: target.top - ch - GAP },
    { left: horizontalCenter, top: target.bottom + GAP },
    { left: target.left - cw - GAP, top: verticalCenter },
    { left: target.right + GAP, top: verticalCenter },
  ]
  const byPreference =
    step.placement === 'bottom'
      ? [candidates[1], candidates[0], candidates[3], candidates[2]]
      : step.placement === 'left'
        ? [candidates[2], candidates[3], candidates[0], candidates[1]]
        : step.placement === 'right'
          ? [candidates[3], candidates[2], candidates[0], candidates[1]]
          : [candidates[0], candidates[1], candidates[3], candidates[2]]

  for (const candidate of byPreference) {
    if (fits(candidate.left, candidate.top)) return candidate
  }
  // Nothing fits cleanly (small screen, tall card) — keep it on-screen.
  return {
    left: horizontalCenter,
    top: clamp(target.bottom + GAP, EDGE, vh - ch - EDGE),
  }
}

function TooltipCard({
  step,
  total,
  index,
  highlight,
  onPrev,
  onNext,
  onClose,
}: {
  step: TourStep
  total: number
  index: number
  highlight: HighlightRect | null
  onPrev: () => void
  onNext: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const card = el.getBoundingClientRect()
    if (!highlight) {
      setPosition({
        left: clamp((window.innerWidth - card.width) / 2, EDGE, window.innerWidth - card.width - EDGE),
        top: clamp((window.innerHeight - card.height) / 2, EDGE, window.innerHeight - card.height - EDGE),
      })
      return
    }
    setPosition(computePlacement(step, highlight, card))
  }, [step, step.title, step.body, highlight, index])

  const isFirst = index === 0
  const isLast = index === total - 1

  return (
    <div
      ref={ref}
      role="tooltip"
      className="pointer-events-auto fixed z-[51] w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-sand-200 bg-white p-4 shadow-2xl shadow-ink-900/20"
      style={position ? { left: position.left, top: position.top } : { visibility: 'hidden' }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-2 font-heading text-sm font-bold text-ink-900">
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-bold text-white">
            {index + 1}
          </span>
          {step.title}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Ignorer la visite guidée"
          className="-mr-1 -mt-1 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <X size={15} aria-hidden />
        </button>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{step.body}</p>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1" aria-hidden>
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-4 bg-brand-600' : 'w-1.5 bg-gray-200'}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {!isFirst && (
            <button
              type="button"
              onClick={onPrev}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
            >
              <ArrowLeft size={13} aria-hidden /> Précédent
            </button>
          )}
          <button
            type="button"
            onClick={isLast ? onClose : onNext}
            className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
          >
            {isLast ? 'Terminer' : 'Suivant'}
            {!isLast && <ArrowRight size={13} aria-hidden />}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Full-screen coachmark layer: a spotlight ring on the step's target plus a
 *  tooltip card. Covers the whole viewport so the rest of the page can't be
 *  clicked mid-tour. */
export function TourOverlay({
  tour,
  stepIndex,
  onPrev,
  onNext,
  onClose,
}: {
  tour: GuidedTour
  stepIndex: number
  onPrev: () => void
  onNext: () => void
  onClose: () => void
}) {
  const step = tour.steps[stepIndex]
  const highlight = useHighlightRect(step?.target, stepIndex)

  useEffect(() => {
    if (step?.target) {
      document.querySelector(step.target)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.target, stepIndex])

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={tour.title}>
      {highlight && (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-lg transition-[left,top,width,height] duration-200"
          style={{
            left: highlight.left - 6,
            top: highlight.top - 6,
            width: highlight.width + 12,
            height: highlight.height + 12,
            boxShadow: `0 0 0 2px rgba(255,255,255,0.95), 0 0 0 9999px rgba(10,13,21,0.62)`,
            borderRadius: '12px',
          }}
        />
      )}
      {step ? (
        <TooltipCard
          step={step}
          total={tour.steps.length}
          index={stepIndex}
          highlight={highlight}
          onPrev={onPrev}
          onNext={onNext}
          onClose={onClose}
        />
      ) : null}
    </div>,
    document.body,
  )
}