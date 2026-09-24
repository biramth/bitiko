/** Color swatch + hex input pair, used by the theme panel, the per-text style
 *  popover and the footer. An empty value means "auto" (the shop theme's own
 *  default for that role) — shown as a transparency checkerboard with an
 *  italic hint instead of a blank text field. With `allowTransparent`, a
 *  "Transparent" pill makes that empty state explicit (e.g. the outline
 *  secondary button). Clicking the swatch opens the native color picker. */
export function ColorField({
  label,
  value,
  placeholder,
  allowTransparent = false,
  onChange,
}: {
  label?: string
  value: string
  placeholder?: string
  allowTransparent?: boolean
  onChange: (value: string) => void
}) {
  const isHex = /^#[0-9a-fA-F]{6}$/.test(value)
  const empty = !isHex

  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <div className={`${label ? 'mt-1 ' : ''}flex items-center gap-2`}>
        <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-gray-200 shadow-inner">
          {empty && (
            <span
              aria-hidden
              className="absolute inset-0"
              style={{
                background: 'conic-gradient(#e5e7eb 25%, #ffffff 0 50%, #e5e7eb 0 75%, #ffffff 0)',
                backgroundSize: '8px 8px',
              }}
            />
          )}
          <span aria-hidden className="absolute inset-0" style={empty ? undefined : { backgroundColor: value }} />
          <input
            type="color"
            value={isHex ? value : '#ffffff'}
            onChange={(e) => onChange(e.target.value)}
            aria-label={label ?? 'Couleur'}
            title={empty ? (placeholder ?? 'Couleur automatique') : value}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`mt-0 w-full max-w-[10rem] flex-1 rounded-lg border bg-white px-3 py-2 text-sm font-mono uppercase text-gray-900 focus:border-brand-400 focus:outline-none placeholder:font-sans placeholder:normal-case placeholder:italic placeholder:text-gray-400 ${
            value === '' ? 'border-dashed border-gray-300' : 'border-gray-200'
          }`}
        />
        {allowTransparent && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-pressed={empty}
            title="Fond transparent (contour avec la couleur du texte)"
            className={`shrink-0 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors ${
              empty
                ? 'border-brand-400 bg-brand-50/70 text-brand-700'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            Transparent
          </button>
        )}
      </div>
    </div>
  )
}