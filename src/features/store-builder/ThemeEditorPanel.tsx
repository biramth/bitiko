import { AlertTriangle } from 'lucide-react'
import { contrastWithWhite } from '@/utils/format'
import type { ContentWidth, FontChoice, RadiusScale, TextScale, ThemeConfig } from '@/types/builder'

const labelClass = 'block text-sm font-medium text-gray-700'
const selectClass =
  'mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-400 focus:outline-none'

/** Groups related settings under a small uppercase heading with a divider —
 *  turns the panel into readable sections instead of one long flat list. */
function ThemeGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-gray-100 pt-5 first:mt-0 first:border-t-0 first:pt-0">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{title}</p>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

/** A row of clickable visual options (radius corners, text size) instead of
 *  a plain <select> — the merchant sees the effect, not just a word. */
function VisualPicker<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string; preview: React.ReactNode }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
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

function ColorField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string
  value: string
  placeholder: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="mt-1 flex items-center gap-3">
        <input
          type="color"
          value={value || placeholder}
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

const RADIUS_OPTIONS: { value: RadiusScale; label: string; rounded: string }[] = [
  { value: 'none', label: 'Aucun', rounded: 'rounded-none' },
  { value: 'md', label: 'Moyen', rounded: 'rounded-md' },
  { value: 'lg', label: 'Grand', rounded: 'rounded-lg' },
  { value: 'full', label: 'Maximal', rounded: 'rounded-full' },
]

const TEXT_SCALE_OPTIONS: { value: TextScale; label: string; size: string }[] = [
  { value: 'sm', label: 'Compacte', size: 'text-xs' },
  { value: 'base', label: 'Normale', size: 'text-sm' },
  { value: 'lg', label: 'Grande', size: 'text-base' },
]

export function ThemeEditorPanel({
  themeColor,
  themeConfig,
  onThemeColorChange,
  onThemeConfigChange,
}: {
  themeColor: string
  themeConfig: ThemeConfig
  onThemeColorChange: (color: string) => void
  onThemeConfigChange: (config: ThemeConfig) => void
}) {
  const isValidColor = /^#[0-9a-fA-F]{6}$/.test(themeColor)
  const lowContrast = isValidColor && contrastWithWhite(themeColor) < 3

  return (
    <div className="space-y-5">
      <ThemeGroup title="Couleurs">
        <ColorField label="Couleur principale" value={themeColor} placeholder="#d9612e" onChange={onThemeColorChange} />
        {lowContrast && (
          <p className="-mt-2 flex items-center gap-1.5 text-xs text-amber-600">
            <AlertTriangle size={13} aria-hidden /> Trop claire pour un texte blanc lisible.
          </p>
        )}
        <ColorField
          label="Couleur secondaire"
          value={themeConfig.secondaryColor}
          placeholder="#f7e6d0"
          onChange={(v) => onThemeConfigChange({ ...themeConfig, secondaryColor: v })}
        />
        <ColorField
          label="Couleur des boutons"
          value={themeConfig.buttonColor}
          placeholder={themeColor || '#d9612e'}
          onChange={(v) => onThemeConfigChange({ ...themeConfig, buttonColor: v })}
        />
        <ColorField
          label="Couleur du texte"
          value={themeConfig.textColor}
          placeholder="#17152e"
          onChange={(v) => onThemeConfigChange({ ...themeConfig, textColor: v })}
        />
        <ColorField
          label="Couleur de fond"
          value={themeConfig.backgroundColor}
          placeholder="#ffffff"
          onChange={(v) => onThemeConfigChange({ ...themeConfig, backgroundColor: v })}
        />
      </ThemeGroup>

      <ThemeGroup title="Typographie">
        <div>
          <label className={labelClass}>Police</label>
          <select
            value={themeConfig.font}
            onChange={(e) => onThemeConfigChange({ ...themeConfig, font: e.target.value as FontChoice })}
            className={selectClass}
          >
            <option value="sora-inter">Sora + Inter (par défaut)</option>
            <option value="inter">Inter partout</option>
            <option value="sora">Sora partout</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Taille des textes</label>
          <div className="mt-1">
            <VisualPicker
              value={themeConfig.textScale}
              onChange={(v) => onThemeConfigChange({ ...themeConfig, textScale: v })}
              options={TEXT_SCALE_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
                preview: <span className={`font-heading font-bold ${o.size}`}>Aa</span>,
              }))}
            />
          </div>
        </div>
      </ThemeGroup>

      <ThemeGroup title="Mise en page">
        <div>
          <label className={labelClass}>Arrondis</label>
          <div className="mt-1">
            <VisualPicker
              value={themeConfig.radius}
              onChange={(v) => onThemeConfigChange({ ...themeConfig, radius: v })}
              options={RADIUS_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
                preview: <span className={`h-5 w-5 border-2 border-current ${o.rounded}`} aria-hidden />,
              }))}
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Largeur du contenu</label>
          <select
            value={themeConfig.contentWidth}
            onChange={(e) => onThemeConfigChange({ ...themeConfig, contentWidth: e.target.value as ContentWidth })}
            className={selectClass}
          >
            <option value="narrow">Étroite</option>
            <option value="normal">Normale</option>
            <option value="wide">Large</option>
          </select>
        </div>
      </ThemeGroup>
    </div>
  )
}
