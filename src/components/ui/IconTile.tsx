import type { LucideIcon } from 'lucide-react'

interface IconTileProps {
  icon: LucideIcon
  tone?: 'brand' | 'dark' | 'gold'
  size?: 'md' | 'lg'
  /** Escape hatch for a one-off soft tint (e.g. a distinct color per card in a grid) instead of a shared tone. */
  tint?: string
}

/** Soft-tinted icon tile shared across marketing surfaces: a light wash of
 * color with a matching glyph and hairline ring, instead of a saturated
 * gradient block. Reads as calm and premium next to the warm sand cards. */
export function IconTile({ icon: Icon, tone = 'brand', size = 'md', tint }: IconTileProps) {
  const tones = {
    brand: 'bg-brand-600/[0.07] text-brand-700 ring-brand-700/10',
    dark: 'bg-ink-900/[0.05] text-ink-800 ring-ink-900/10',
    gold: 'bg-gold-400/15 text-gold-500 ring-gold-500/20',
  }
  const sizes = size === 'lg' ? 'h-14 w-14 rounded-2xl' : 'h-11 w-11 rounded-xl'
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ring-1 ring-inset transition-transform duration-300 group-hover:scale-105 ${sizes} ${tint ?? tones[tone]}`}
    >
      <Icon size={size === 'lg' ? 24 : 19} strokeWidth={2} aria-hidden />
    </span>
  )
}
