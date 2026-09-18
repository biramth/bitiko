import { Palette, RotateCcw } from 'lucide-react'
import { hasTextStyle } from '@/config/textStyle'
import type { FontChoice, TextStyleOverride, TextWeight } from '@/types/builder'
import { ColorField } from './ColorField'

const WEIGHTS: { value: TextWeight; label: string; css: number }[] = [
  { value: 'normal', label: 'Fin', css: 400 },
  { value: 'medium', label: 'Moyen', css: 500 },
  { value: 'semibold', label: 'Semi', css: 600 },
  { value: 'bold', label: 'Gras', css: 700 },
]

const FONTS: { value: FontChoice | ''; label: string }[] = [
  { value: '', label: 'Police du thème' },
  { value: 'sora', label: 'Sora' },
  { value: 'inter', label: 'Inter' },
]

/** Collapses an override with nothing set back to `undefined`, so a shop's
 *  saved config doesn't accumulate empty `{}` style objects. */
function normalize(next: TextStyleOverride): TextStyleOverride | undefined {
  const cleaned: TextStyleOverride = {}
  if (next.color) cleaned.color = next.color
  if (next.font) cleaned.font = next.font
  if (next.weight) cleaned.weight = next.weight
  if (next.italic) cleaned.italic = true
  return Object.keys(cleaned).length ? cleaned : undefined
}

const toggleClass = (active: boolean) =>
  `min-h-9 rounded-lg border px-2.5 text-xs transition-colors ${
    active ? 'border-brand-400 bg-brand-50/70 text-brand-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
  }`

/** The one control set for restyling a single text — color, font, weight,
 *  italic. Used both in the sidebar editors (via `TextStyleField`) and in the
 *  live-preview popover (`InlineStyleToolbar`), so there is exactly one
 *  implementation. Unset = the shop theme's own value. */
export function TextStyleControls({
  value,
  onChange,
}: {
  value: TextStyleOverride | undefined
  onChange: (value: TextStyleOverride | undefined) => void
}) {
  const current = value ?? {}
  const set = (patch: Partial<TextStyleOverride>) => onChange(normalize({ ...current, ...patch }))

  return (
    <div className="space-y-3">
      <ColorField
        label="Couleur"
        value={current.color ?? ''}
        placeholder="Couleur du thème"
        onChange={(color) => set({ color })}
      />
      <div>
        <label className="block text-sm font-medium text-gray-700">Police</label>
        <select
          value={current.font ?? ''}
          onChange={(e) => set({ font: (e.target.value || undefined) as FontChoice | undefined })}
          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-400 focus:outline-none"
        >
          {FONTS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Style</label>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {WEIGHTS.map((w) => (
            <button
              key={w.value}
              type="button"
              aria-pressed={current.weight === w.value}
              onClick={() => set({ weight: current.weight === w.value ? undefined : w.value })}
              className={toggleClass(current.weight === w.value)}
              style={{ fontWeight: w.css }}
            >
              {w.label}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={!!current.italic}
            onClick={() => set({ italic: !current.italic })}
            className={`${toggleClass(!!current.italic)} italic`}
          >
            Italique
          </button>
        </div>
      </div>
      {hasTextStyle(value) && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800"
        >
          <RotateCcw size={12} aria-hidden /> Revenir au style du thème
        </button>
      )}
    </div>
  )
}

/** Collapsible "Style du texte" block for the sidebar editors — sits right
 *  under the text field it restyles. */
export function TextStyleField({
  label = 'Style du texte',
  value,
  onChange,
}: {
  label?: string
  value: TextStyleOverride | undefined
  onChange: (value: TextStyleOverride | undefined) => void
}) {
  return (
    <details className="group mt-1.5 rounded-lg border border-gray-200 bg-gray-50/60">
      <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 px-3 text-xs font-medium text-gray-600 [&::-webkit-details-marker]:hidden">
        <Palette size={13} aria-hidden />
        {label}
        {hasTextStyle(value) && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" role="img" aria-label="Personnalisé" />}
        <span className="ml-auto text-gray-400 transition-transform group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="space-y-2 border-t border-gray-200 p-3">
        <p className="text-xs leading-relaxed text-gray-500">
          Laisser vide = la couleur, la police et la graisse définies dans Thème.
        </p>
        <TextStyleControls value={value} onChange={onChange} />
      </div>
    </details>
  )
}
