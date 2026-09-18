import type { ReactNode } from 'react'

/** Tiny abstract sketches used as `VisualPicker` previews for section layouts:
 *  a frame holding gray bars (text lines) and blocks (images/cards). Purely
 *  decorative — `currentColor` follows the picker's selected/unselected tint. */
export function SwatchFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      aria-hidden
      className={`flex h-9 w-14 overflow-hidden rounded border border-current/30 bg-white p-1 ${className}`}
    >
      {children}
    </span>
  )
}

/** A line of text. */
export function SwatchBar({ w = 'w-full', className = '' }: { w?: string; className?: string }) {
  return <span className={`block h-[3px] rounded-full bg-current opacity-60 ${w} ${className}`} />
}

/** An image / card / column. */
export function SwatchBlock({ className = '' }: { className?: string }) {
  return <span className={`block rounded-[2px] bg-current opacity-25 ${className}`} />
}
