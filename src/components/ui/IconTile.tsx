import type { LucideIcon } from 'lucide-react'

interface IconTileProps {
  icon: LucideIcon
  tone?: 'brand' | 'dark' | 'gold'
  size?: 'md' | 'lg'
  /** Escape hatch for a one-off gradient (e.g. a distinct color per card in a grid) instead of a shared tone. */
  gradient?: string
}

/** Consistent, premium icon treatment shared across marketing and onboarding —
 * a soft gradient tile instead of a flat tint, so icons read as designed
 * artwork rather than default library glyphs dropped onto a colored square. */
export function IconTile({ icon: Icon, tone = 'brand', size = 'md', gradient }: IconTileProps) {
  const tones = {
    brand: 'from-brand-500 to-brand-700 text-white shadow-brand-900/15',
    dark: 'from-ink-800 to-ink-950 text-white shadow-ink-900/20',
    gold: 'from-gold-300 to-gold-500 text-ink-900 shadow-gold-900/10',
  }
  const sizes = size === 'lg' ? 'h-14 w-14 rounded-2xl' : 'h-11 w-11 rounded-xl'
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center bg-gradient-to-br shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${sizes} ${gradient ?? tones[tone]}`}
    >
      <Icon size={size === 'lg' ? 24 : 19} strokeWidth={1.75} aria-hidden />
    </span>
  )
}
