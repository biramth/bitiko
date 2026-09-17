import { Check } from 'lucide-react'
import { STORE_VIBES, type StoreVibeKey } from '@/config/ambiances'

/** Corner radius used to preview each vibe's shape language. */
const VIBE_RADIUS_PREVIEW: Record<StoreVibeKey, string> = {
  epure: '6px',
  cosy: '16px',
  colorful: '16px',
  premium: '6px',
}

/**
 * The ambiance chooser, shared by onboarding, the Apparence settings and the
 * post-update dialog so all three stay visually identical.
 */
export function VibePicker({
  value,
  onSelect,
  disabled,
  columns = 2,
}: {
  value: StoreVibeKey | null
  onSelect: (key: StoreVibeKey) => void
  disabled?: boolean
  columns?: 1 | 2
}) {
  return (
    <div className={`grid gap-2.5 ${columns === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
      {STORE_VIBES.map((vibe) => {
        const selected = value === vibe.key
        return (
          <button
            key={vibe.key}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(vibe.key)}
            aria-pressed={selected}
            className={`rounded-xl border p-3 text-left transition-colors disabled:opacity-60 ${
              selected ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-500' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className="flex items-center justify-between">
              <span
                className="flex h-9 w-14 items-center justify-center text-lg font-bold"
                style={{
                  backgroundColor: vibe.theme.backgroundColor,
                  color: vibe.swatch[0],
                  borderRadius: VIBE_RADIUS_PREVIEW[vibe.key],
                }}
                aria-hidden
              >
                Aa
              </span>
              {selected && <Check size={14} className="text-brand-700" aria-hidden />}
            </span>
            <span className="mt-2 flex items-center gap-1.5">
              <span className="block text-sm font-semibold text-ink-900">{vibe.label}</span>
              <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ backgroundColor: vibe.swatch[0] }} aria-hidden />
              <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ backgroundColor: vibe.swatch[1] }} aria-hidden />
            </span>
            <span className="mt-0.5 block text-xs leading-snug text-gray-500">{vibe.description}</span>
          </button>
        )
      })}
    </div>
  )
}
