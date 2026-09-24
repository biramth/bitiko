import { baseOf, compositeHex, hexWithAlpha, hexWithNewAlpha } from '@/utils/color'

/** Unified color picker: native swatch + hex `#rrggbb` / `#rrggbbaa` field +
 *  opacity slider. One control carries color *and* transparency — there is no
 *  separate boolean "Transparent" anymore. An empty value means "auto" (the
 *  shop theme's default for that role) and shows as a checkerboard swatch.
 *  Opacity is stored as the 8-digit form (`#rrggbbaa`); fully opaque values
 *  collapse back to 6-digit `#rrggbb`. */
export function ColorField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label?: string
  value: string
  placeholder?: string
  onChange: (value: string) => void
}) {
  const parsed = hexWithAlpha(value)
  const empty = !parsed
  const swatch = empty ? undefined : compositeHex(value, '#ffffff')
  const opacity = parsed ? Math.round(parsed.alpha * 100) : 100

  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <div className={`${label ? 'mt-1 ' : ''}flex flex-wrap items-center gap-2`}>
        <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-gray-200 shadow-inner">
          {empty && (
            <span aria-hidden className="absolute inset-0" style={{
              background: 'conic-gradient(#e5e7eb 25%, #ffffff 0 50%, #e5e7eb 0 75%, #ffffff 0)',
              backgroundSize: '8px 8px',
            }} />
          )}
          <span aria-hidden className="absolute inset-0" style={swatch ? { backgroundColor: swatch } : undefined} />
          <input
            type="color"
            value={parsed ? baseOf(parsed ? `#${value.slice(1, 7)}` : '#ffffff') : '#ffffff'}
            onChange={(e) => {
              const next = `#${e.target.value.slice(1, 7)}`
              onChange(parsed ? hexWithNewAlpha(next, parsed.alpha) : next)
            }}
            aria-label={label ?? 'Couleur'}
            title={empty ? (placeholder ?? 'Couleur automatique') : value}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || '#rrggbb'}
          spellCheck={false}
          className={`h-10 w-32 flex-1 rounded-lg border bg-white px-3 py-2 font-mono text-sm lowercase text-gray-900 focus:border-brand-400 focus:outline-none placeholder:normal-case placeholder:italic placeholder:text-gray-400 ${
            empty ? 'border-dashed border-gray-300' : 'border-gray-200'
          }`}
        />
        <label className="flex items-center gap-2 text-xs text-gray-500">
          <span className="sr-only">{label ? `${label} : opacité` : 'Opacité'}</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={opacity}
            disabled={empty}
            onChange={(e) => onChange(hexWithNewAlpha(value || '#000000', Number(e.target.value) / 100))}
            className="h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-gradient-to-r from-gray-200 to-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
          />
          <span className="w-8 text-right tabular-nums">{empty ? '—' : `${opacity}%`}</span>
        </label>
      </div>
    </div>
  )
}
