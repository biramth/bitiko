import { AlertTriangle } from 'lucide-react'
import { contrastWithWhite } from '@/utils/format'
import type { ContentWidth, FontChoice, RadiusScale, TextScale, ThemeConfig } from '@/types/builder'

const labelClass = 'block text-sm font-medium text-gray-700'
const selectClass =
  'mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-400 focus:outline-none'

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
      <ColorField label="Couleur principale" value={themeColor} placeholder="#d9612e" onChange={onThemeColorChange} />
      {lowContrast && (
        <p className="-mt-3 flex items-center gap-1.5 text-xs text-amber-600">
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
        <select
          value={themeConfig.textScale}
          onChange={(e) => onThemeConfigChange({ ...themeConfig, textScale: e.target.value as TextScale })}
          className={selectClass}
        >
          <option value="sm">Compacte</option>
          <option value="base">Normale</option>
          <option value="lg">Grande</option>
        </select>
      </div>

      <div>
        <label className={labelClass}>Arrondis</label>
        <select
          value={themeConfig.radius}
          onChange={(e) => onThemeConfigChange({ ...themeConfig, radius: e.target.value as RadiusScale })}
          className={selectClass}
        >
          <option value="none">Aucun (angles nets)</option>
          <option value="md">Moyen</option>
          <option value="lg">Grand</option>
          <option value="full">Maximal (pilules)</option>
        </select>
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
    </div>
  )
}
