import { AlertTriangle, ChevronDown } from 'lucide-react'
import { contrastRatio, contrastWithWhite } from '@/utils/format'
import { RADIUS_CSS } from '@/config/themeTokens'
import { ColorField } from './components/ColorField'
import { VisualPicker } from './components/VisualPicker'
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

/** Collapsed-by-default section holding the less-often-used theme knobs, so the
 *  panel opens on the three button roles the merchant cares about most. */
function AdvancedSettings({ children }: { children: React.ReactNode }) {
  return (
    <details className="group border-t border-gray-100 pt-5">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 transition-colors hover:text-gray-600 [&::-webkit-details-marker]:hidden">
        <ChevronDown size={13} className="shrink-0 transition-transform group-open:rotate-180" aria-hidden />
        Réglages avancés
      </summary>
      <div className="mt-4 space-y-4">{children}</div>
    </details>
  )
}

/** Live mini preview of a button in the exact colors/radius being chosen —
 *  the merchant sees the effect of the two pickers at once, no guesswork. */
function ButtonPreview({
  background,
  text,
  radius,
  outline = false,
}: {
  background: string
  text: string
  radius: RadiusScale
  outline?: boolean
}) {
  const filled = !outline && /^#[0-9a-fA-F]{6}$/.test(background)
  const style: React.CSSProperties = filled
    ? { borderRadius: RADIUS_CSS[radius], backgroundColor: background, color: text }
    : { borderRadius: RADIUS_CSS[radius], border: `1px solid ${text}`, color: text, background: 'transparent' }
  return (
    <span className="w-24 shrink-0 px-3 py-1.5 text-center text-xs font-semibold" style={style}>
      Bouton
    </span>
  )
}

/** One rounded role card: title, the colors for this role (fond + texte) and a
 *  live button preview, plus a contrast warning when the pair is unreadable. */
function ButtonRoleRow({
  title,
  description,
  background,
  text,
  backgroundPlaceholder,
  textPlaceholder,
  previewBackground,
  previewText,
  onBackground,
  onText,
  radius,
  outline = false,
}: {
  title: string
  description: string
  background: string
  text: string
  backgroundPlaceholder: string
  textPlaceholder: string
  /** Resolved colors (fallbacks applied) used by the preview and the contrast
   *  check — raw values above are what the hex fields actually edit. */
  previewBackground: string
  previewText: string
  onBackground: (value: string) => void
  onText: (value: string) => void
  radius: RadiusScale
  outline?: boolean
}) {
  const contrastSafe = /^#[0-9a-fA-F]{6}$/.test(previewBackground) && /^#[0-9a-fA-F]{6}$/.test(previewText)
  const lowContrast = !outline && contrastSafe && contrastRatio(previewBackground, previewText) < 3
  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="mt-0.5 text-xs leading-snug text-gray-500">{description}</p>
          <div className="mt-3 space-y-3">
            <ColorField label="Fond" value={background} placeholder={backgroundPlaceholder} onChange={onBackground} />
            <ColorField label="Texte" value={text} placeholder={textPlaceholder} onChange={onText} />
          </div>
          {lowContrast && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
              <AlertTriangle size={13} aria-hidden /> Contraste faible : le texte risque d'être difficile à lire.
            </p>
          )}
        </div>
        <ButtonPreview background={previewBackground} text={previewText} radius={radius} outline={outline} />
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
  const accent = themeColor || '#d9612e'
  const textColor = themeConfig.textColor || '#17152e'

  const set = (patch: Partial<ThemeConfig>) => onThemeConfigChange({ ...themeConfig, ...patch })

  return (
    <div className="space-y-5">
      <ThemeGroup title="Boutons">
        <ButtonRoleRow
          title="Bouton principal"
          description="Les CTA de la boutique : « Ajouter au panier », « Payer », « Voir le catalogue »…"
          background={themeConfig.buttonColor}
          text={themeConfig.buttonTextColor ?? ''}
          previewBackground={themeConfig.buttonColor || accent}
          previewText={themeConfig.buttonTextColor || '#ffffff'}
          backgroundPlaceholder={accent}
          textPlaceholder="#ffffff"
          onBackground={(v) => set({ buttonColor: v })}
          onText={(v) => set({ buttonTextColor: v })}
          radius={themeConfig.radius}
        />
        <ButtonRoleRow
          title="Bouton secondaire"
          description="Les actions secondaires en contour : « Continuer mes achats », WhatsApp, partager…"
          background={themeConfig.secondaryButtonColor ?? ''}
          text={themeConfig.secondaryButtonTextColor ?? ''}
          previewBackground={themeConfig.secondaryButtonColor || 'transparent'}
          previewText={themeConfig.secondaryButtonTextColor || textColor}
          backgroundPlaceholder="transparent"
          textPlaceholder={textColor}
          onBackground={(v) => set({ secondaryButtonColor: v })}
          onText={(v) => set({ secondaryButtonTextColor: v })}
          radius={themeConfig.radius}
          outline={!themeConfig.secondaryButtonColor}
        />
        <ButtonRoleRow
          title="Bouton tertiaire"
          description="Tuiles de catégories et grands bandeaux colorés."
          background={themeConfig.tertiaryButtonColor ?? ''}
          text={themeConfig.tertiaryButtonTextColor ?? ''}
          previewBackground={themeConfig.tertiaryButtonColor || accent}
          previewText={themeConfig.tertiaryButtonTextColor || '#ffffff'}
          backgroundPlaceholder={accent}
          textPlaceholder="#ffffff"
          onBackground={(v) => set({ tertiaryButtonColor: v })}
          onText={(v) => set({ tertiaryButtonTextColor: v })}
          radius={themeConfig.radius}
        />
      </ThemeGroup>

      <AdvancedSettings>
        <ThemeGroup title="Couleur principale">
          <ColorField label="Couleur principale" value={themeColor} placeholder="#d9612e" onChange={onThemeColorChange} />
          {lowContrast && (
            <p className="-mt-2 flex items-center gap-1.5 text-xs text-amber-600">
              <AlertTriangle size={13} aria-hidden /> Trop claire pour un texte blanc lisible.
            </p>
          )}
        </ThemeGroup>

        <ThemeGroup title="Couleurs de la page">
          <ColorField
            label="Couleur secondaire"
            value={themeConfig.secondaryColor}
            placeholder="#f7e6d0"
            onChange={(v) => set({ secondaryColor: v })}
          />
          <ColorField
            label="Couleur du texte"
            value={themeConfig.textColor}
            placeholder="#17152e"
            onChange={(v) => set({ textColor: v })}
          />
          <ColorField
            label="Couleur de fond"
            value={themeConfig.backgroundColor}
            placeholder="#ffffff"
            onChange={(v) => set({ backgroundColor: v })}
          />
        </ThemeGroup>

        <ThemeGroup title="Typographie">
          <div>
            <label className={labelClass}>Police</label>
            <select
              value={themeConfig.font}
              onChange={(e) => set({ font: e.target.value as FontChoice })}
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
                onChange={(v) => set({ textScale: v })}
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
                onChange={(v) => set({ radius: v })}
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
              onChange={(e) => set({ contentWidth: e.target.value as ContentWidth })}
              className={selectClass}
            >
              <option value="narrow">Étroite</option>
              <option value="normal">Normale</option>
              <option value="wide">Large</option>
            </select>
          </div>
        </ThemeGroup>
      </AdvancedSettings>
    </div>
  )
}