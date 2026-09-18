/** A row of clickable visual options (radius corners, text size, section
 *  layouts) instead of a plain <select> — the merchant sees the effect, not
 *  just a word. */
export function VisualPicker<T extends string>({
  value,
  options,
  onChange,
  columns = 4,
}: {
  value: T
  options: { value: T; label: string; preview: React.ReactNode }[]
  onChange: (value: T) => void
  columns?: number
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 transition-colors ${
            value === opt.value ? 'border-brand-400 bg-brand-50/70 text-brand-700' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          {opt.preview}
          <span className="text-[11px] font-medium leading-none">{opt.label}</span>
        </button>
      ))}
    </div>
  )
}
