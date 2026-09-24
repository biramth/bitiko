import { useState } from 'react'
import { AlertTriangle, ChevronDown, LayoutTemplate, MousePointerClick, Palette, Type, type LucideIcon } from 'lucide-react'
import { contrastRatio, contrastWithWhite } from '@/utils/format'
import { alphaOf } from '@/utils/color'
import { RADIUS_CSS } from '@/config/themeTokens'
import { ColorField } from './components/ColorField'
import { VisualPicker } from './components/VisualPicker'
import type { ContentWidth, FontChoice, RadiusScale, TextScale, ThemeConfig } from '@/types/builder'

const labelClass = 'block text-sm font-medium text-gray-700'
const selectClass =
  'mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 focus:border-brand-400 focus:outline-none sm:text-sm'

/** `#RRGGBB` or `#RRGGBBAA` — the two forms `ColorField` can produce. */
const HEX_WITH_ALPHA = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/

/** Every panel group is a collapsible accordion — the merchant unfolds exactly
 *  what they want to tweak. Controlled + exclusive: all groups start closed,
 *  opening one closes the other (native <details> elements stack open and
 *  pushed the panel into runaway lengths that broke the surrounding layout).
 *  Nothing that shapes the shop lives in a hidden "Réglages avancés"
 *  catch-all anymore; that slot is reserved in code for future, genuinely
 *  advanced options (effects, animations…). */
function AccordionGroup({
  icon: Icon,
  title,
  open,
  onToggle,
  children,
}: {
  icon: LucideIcon
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/40">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-11 w-full cursor-pointer items-center gap-2 px-3 text-sm font-semibold text-gray-800 transition-colors hover:text-gray-950"
      >
        <Icon size={15} className="shrink-0 text-gray-400" aria-hidden />
        {title}
        <ChevronDown size={15} className={`ml-auto shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && <div className="space-y-4 border-t border-gray-200 p-4">{children}</div>}
    </div>
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
  const filled = !outline && HEX_WITH_ALPHA.test(background) && alphaOf(background) >= 1
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
 *  live button preview, plus a contrast warning when the pair is unreadable.
 *  Transparency needs no toggle: the Fond picker carries an opacity slider,
 *  and an empty value means "auto" (transparent outline for the secondary). */
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
   *  check — raw values above are what the color fields actually edit. */
  previewBackground: string
  previewText: string
  onBackground: (value: string) => void
  onText: (value: string) => void
  radius: RadiusScale
  outline?: boolean
}) {
  const contrastSafe = HEX_WITH_ALPHA.test(previewBackground) && HEX_WITH_ALPHA.test(previewText)
  const lowContrast = !outline && contrastSafe && contrastRatio(previewBackground, previewText) < 3
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between">
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
  const isValidColor = HEX_WITH_ALPHA.test(themeColor)
  const lowContrast = isValidColor && contrastWithWhite(themeColor) < 3
  const accent = themeColor || '#d9612e'
  const textColor = themeConfig.textColor || '#17152e'

  const set = (patch: Partial<ThemeConfig>) => onThemeConfigChange({ ...themeConfig, ...patch })

  // Exclusive accordion: everything starts closed, opening a group closes
  // the others — stacked-open panels pushed this panel (and its scroll
  // container) into runaway lengths.
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const toggleGroup = (id: string) => setOpenGroup((current) => (current === id ? null : id))

  return (
    <div className="space-y-4">
      <AccordionGroup icon={Palette} title="Couleurs" open={openGroup === 'couleurs'} onToggle={() => toggleGroup('couleurs')}>
        <div className="space-y-1">
          <ColorField label="Couleur de la boutique" value={themeColor} placeholder="Auto" onChange={onThemeColorChange} />
          {lowContrast ? (
            <p className="flex items-center gap-1.5 text-xs text-amber-600">
              <AlertTriangle size={13} aria-hidden /> Trop claire pour un texte blanc lisible.
            </p>
          ) : (
            <p className="text-xs text-gray-400">
              L'accent de la marque : boutons principaux, liens et repères de la boutique.
            </p>
          )}
        </div>
        <ColorField
          label="Couleur de fond"
          value={themeConfig.backgroundColor}
          placeholder="Auto"
          onChange={(v) => set({ backgroundColor: v })}
        />
        <ColorField
          label="Couleur du texte"
          value={themeConfig.textColor}
          placeholder="Auto"
          onChange={(v) => set({ textColor: v })}
        />
        <ColorField
          label="Couleur secondaire"
          value={themeConfig.secondaryColor}
          placeholder="Auto"
          onChange={(v) => set({ secondaryColor: v })}
        />
      </AccordionGroup>

      <AccordionGroup icon={MousePointerClick} title="Boutons" open={openGroup === 'boutons'} onToggle={() => toggleGroup('boutons')}>
        <ButtonRoleRow
          title="Bouton principal"
          description="Les CTA de la boutique : « Ajouter au panier », « Payer », « Voir le catalogue »…"
          background={themeConfig.buttonColor}
          text={themeConfig.buttonTextColor ?? ''}
          previewBackground={themeConfig.buttonColor || accent}
          previewText={themeConfig.buttonTextColor || '#ffffff'}
          backgroundPlaceholder="Auto"
          textPlaceholder="Auto"
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
          backgroundPlaceholder="Transparent"
          textPlaceholder="Auto"
          onBackground={(v) => set({ secondaryButtonColor: v })}
          onText={(v) => set({ secondaryButtonTextColor: v })}
          radius={themeConfig.radius}
          outline={!themeConfig.secondaryButtonColor || alphaOf(themeConfig.secondaryButtonColor) < 1}
        />
        <ButtonRoleRow
          title="Bouton tertiaire"
          description="Tuiles de catégories et grands bandeaux colorés."
          background={themeConfig.tertiaryButtonColor ?? ''}
          text={themeConfig.tertiaryButtonTextColor ?? ''}
          previewBackground={themeConfig.tertiaryButtonColor || accent}
          previewText={themeConfig.tertiaryButtonTextColor || '#ffffff'}
          backgroundPlaceholder="Auto"
          textPlaceholder="Auto"
          onBackground={(v) => set({ tertiaryButtonColor: v })}
          onText={(v) => set({ tertiaryButtonTextColor: v })}
          radius={themeConfig.radius}
        />
      </AccordionGroup>

      <AccordionGroup icon={Type} title="Typographie" open={openGroup === 'typo'} onToggle={() => toggleGroup('typo')}>
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
      </AccordionGroup>

      <AccordionGroup icon={LayoutTemplate} title="Mise en page" open={openGroup === 'layout'} onToggle={() => toggleGroup('layout')}>
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
      </AccordionGroup>

      {/* Réglages avancés (réservé) : les effets & animations viendront ici
          quand ils existeront — aucun réglage de base n'a vocation à y être
          rangé, le look complet est accessible d'emblée ci-dessus. */}
    </div>
  )
}