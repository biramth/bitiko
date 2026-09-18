/** Color swatch + hex input pair — same control the theme panel, the footer
 *  and the per-text style popover all use. */
export function ColorField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label?: string
  value: string
  placeholder: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <div className={`${label ? 'mt-1 ' : ''}flex items-center gap-3`}>
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : /^#[0-9a-fA-F]{6}$/.test(placeholder) ? placeholder : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-gray-200 p-1"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-0 max-w-[9rem] flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-mono uppercase text-gray-900 focus:border-brand-400 focus:outline-none"
        />
      </div>
    </div>
  )
}
