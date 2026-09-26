import { useState } from 'react'
import { ChevronDown, type Pencil } from 'lucide-react'
import { formatCurrency } from '@/utils/format'

export function FormCard({
  icon: Icon,
  title,
  description,
  collapsible = false,
  defaultOpen = true,
  badge,
  children,
}: {
  icon: typeof Pencil
  title: string
  description?: string
  /** Carte avancée : repliée tant qu'elle est vide, pour ne pas noyer le formulaire de base. */
  collapsible?: boolean
  defaultOpen?: boolean
  /** Petit compteur affiché à côté du titre (ex. nombre de variantes). */
  badge?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const expanded = !collapsible || open
  const heading = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <Icon size={18} aria-hidden />
      </span>
      <div className="min-w-0 flex-1 text-left">
        <h2 className="flex items-center gap-2 font-heading font-semibold text-gray-900">
          {title}
          {badge && <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-800">{badge}</span>}
        </h2>
        {description && <p className={`text-sm text-gray-500 ${collapsible && !open ? 'line-clamp-1' : ''}`}>{description}</p>}
      </div>
    </>
  )
  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className={`flex w-full items-start gap-3 px-5 py-4 ${open ? 'border-b border-gray-100' : ''}`}
        >
          {heading}
          <ChevronDown size={18} aria-hidden className={`mt-2 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      ) : (
        <header className="flex items-start gap-3 border-b border-gray-100 px-5 py-4">{heading}</header>
      )}
      {expanded && <div className="space-y-4 p-5">{children}</div>}
    </section>
  )
}


export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  description: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left ${
        disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-gray-50'
      }`}
    >
      <span>
        <span className="block text-sm font-medium text-gray-900">{label}</span>
        <span className="block text-xs text-gray-500">{description}</span>
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-emerald-500' : 'bg-gray-200'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  )
}

export function ProductPreview({
  image,
  name,
  active,
  price,
  stock,
  lowStockThreshold,
  currency,
  categoryName,
  description,
}: {
  image: string | null
  name: string
  active: boolean
  price: number
  stock: number
  lowStockThreshold: number
  currency: string
  categoryName?: string
  description: string
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <header className="border-b border-gray-100 px-5 py-4">
        <h2 className="font-heading font-semibold text-gray-900">Aperçu</h2>
      </header>
      <div className="p-5">
        <div className="overflow-hidden rounded-xl border border-sand-200 bg-sand-50">
          <div className="flex h-32 items-center justify-center bg-sand-100">
            {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <span className="text-xs text-gray-400">Photo du produit</span>}
          </div>
          <div className="p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate font-heading font-semibold text-ink-900">{name.trim() || 'Nom du produit'}</p>
              {!active && <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">Inactif</span>}
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-brand-600">{formatCurrency(price, currency)}</p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  stock <= 0 ? 'bg-red-100 text-red-800' : stock <= lowStockThreshold ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {stock <= 0 ? 'Rupture' : `${stock} en stock`}
              </span>
            </div>
            {categoryName && <p className="mt-1 text-xs text-gray-500">{categoryName}</p>}
            {description.trim() && <p className="mt-2 line-clamp-3 text-xs text-gray-600">{description.trim()}</p>}
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500">Mis à jour en direct — ce que verront vos clients.</p>
      </div>
    </section>
  )
}
