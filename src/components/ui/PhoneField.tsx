import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { flagEmoji, getCountryPreset } from '@/config/countries'
import { parseInternationalInput } from '@/features/onboarding/defaults'

export interface PhoneCountryOption {
  code: string
  name: string
}

/**
 * Numéro de téléphone avec sélecteur d'indicatif à la WhatsApp : pays + indicatif
 * à gauche, numéro national à droite. Coller ou taper un numéro international
 * (« +225… », « 00225… ») bascule le pays tout seul.
 */
export function PhoneField({
  id,
  countryCode,
  onCountryChange,
  value,
  onChange,
  countries,
  placeholder,
  invalid = false,
  autoComplete = 'tel-national',
}: {
  id?: string
  countryCode: string
  onCountryChange: (code: string) => void
  value: string
  onChange: (value: string) => void
  countries: PhoneCountryOption[]
  placeholder?: string
  invalid?: boolean
  autoComplete?: string
}) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const listId = `${inputId}-countries`
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const current = getCountryPreset(countryCode)
  const allowed = useMemo(() => countries.map((c) => c.code), [countries])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase().replace(/^\+/, '')
    if (!needle) return countries
    return countries.filter((c) => c.name.toLowerCase().includes(needle) || getCountryPreset(c.code).dialCode.includes(needle))
  }, [countries, query])

  useEffect(() => {
    if (!open) return
    searchRef.current?.focus()
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const handleInput = (raw: string) => {
    const parsed = parseInternationalInput(raw, allowed)
    if (parsed) {
      onCountryChange(parsed.countryCode)
      onChange(parsed.national)
    } else {
      onChange(raw)
    }
  }

  const select = (code: string) => {
    onCountryChange(code)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={rootRef} className="relative">
      <div
        className={`flex items-stretch rounded-lg border bg-white transition-colors focus-within:border-brand-400 ${
          invalid ? 'border-red-300' : 'border-gray-200'
        }`}
      >
        {countries.length > 1 ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listId}
            aria-label={`Indicatif : ${current.name} ${current.dialCode}`}
            className="flex shrink-0 items-center gap-1.5 rounded-l-lg border-r border-gray-200 bg-gray-50 px-3 text-sm text-gray-800 transition-colors hover:bg-gray-100"
          >
            <span className="text-base leading-none" aria-hidden>
              {flagEmoji(current.code)}
            </span>
            <span className="font-medium tabular-nums">{current.dialCode}</span>
            <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
          </button>
        ) : (
          <span
            className="flex shrink-0 items-center gap-1.5 rounded-l-lg border-r border-gray-200 bg-gray-50 px-3 text-sm text-gray-800"
            title={current.name}
          >
            <span className="text-base leading-none" aria-hidden>
              {flagEmoji(current.code)}
            </span>
            <span className="font-medium tabular-nums">{current.dialCode}</span>
          </span>
        )}
        <input
          id={inputId}
          type="tel"
          inputMode="tel"
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => handleInput(e.target.value)}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          className="min-w-0 flex-1 rounded-r-lg bg-transparent px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
        />
      </div>

      {open && countries.length > 1 && (
        <div className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl shadow-ink-900/10 sm:right-auto sm:w-72">
          <div className="relative border-b border-gray-100">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un pays"
              aria-label="Rechercher un pays"
              className="w-full py-2.5 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:outline-none"
            />
          </div>
          <ul id={listId} role="listbox" aria-label="Pays" className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && <li className="px-3 py-2 text-sm text-gray-400">Aucun pays trouvé</li>}
            {filtered.map((option) => {
              const preset = getCountryPreset(option.code)
              const selected = option.code === countryCode
              return (
                <li key={option.code} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => select(option.code)}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 ${
                      selected ? 'bg-brand-50/50' : ''
                    }`}
                  >
                    <span className="text-base leading-none" aria-hidden>
                      {flagEmoji(option.code)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-gray-900">{option.name}</span>
                    <span className="shrink-0 tabular-nums text-gray-500">{preset.dialCode}</span>
                    {selected && <Check size={14} className="shrink-0 text-brand-600" aria-hidden />}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
