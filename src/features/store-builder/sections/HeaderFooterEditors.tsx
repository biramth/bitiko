import { Link } from 'react-router-dom'
import { Lock, Plus, Trash2 } from 'lucide-react'
import type { FooterLayout, FooterSectionConfig, HeaderLayout, HeaderSectionConfig, NavigationLink } from '@/types/builder'
import { editorHelpClass, editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'
import { TextStyleField } from '../components/TextStyleControls'
import { ColorField } from '../components/ColorField'
import { VisualPicker } from '../components/VisualPicker'
import { SwatchBar, SwatchBlock, SwatchFrame } from '../components/LayoutSwatch'
import { controlClass } from '@/components/ui/styles'

const checkboxRow = 'flex items-center gap-2 text-sm text-gray-700'

const HEADER_LAYOUTS: { value: HeaderLayout; label: string; preview: React.ReactNode }[] = [
  {
    value: 'left-logo',
    label: 'Classique',
    preview: (
      <SwatchFrame className="items-center justify-between gap-1">
        <SwatchBlock className="h-2 w-3" />
        <SwatchBar w="w-1/3" />
      </SwatchFrame>
    ),
  },
  {
    value: 'centered-logo',
    label: 'Logo centré',
    preview: (
      <SwatchFrame className="flex-col items-center justify-center gap-1">
        <SwatchBlock className="h-2 w-3" />
        <SwatchBar w="w-2/3" />
      </SwatchFrame>
    ),
  },
  {
    value: 'split',
    label: 'Réparti',
    preview: (
      <SwatchFrame className="items-center justify-between gap-1">
        <SwatchBar w="w-1/4" />
        <SwatchBlock className="h-2 w-3" />
        <SwatchBlock className="h-2 w-1.5" />
      </SwatchFrame>
    ),
  },
]

const FOOTER_LAYOUTS: { value: FooterLayout; label: string; preview: React.ReactNode }[] = [
  {
    value: 'columns',
    label: '3 colonnes',
    preview: (
      <SwatchFrame className="items-center gap-1">
        <SwatchBlock className="h-4 w-1/3" />
        <SwatchBlock className="h-4 w-1/3" />
        <SwatchBlock className="h-4 w-1/3" />
      </SwatchFrame>
    ),
  },
  {
    value: 'centered',
    label: 'Centré',
    preview: (
      <SwatchFrame className="flex-col items-center justify-center gap-1">
        <SwatchBlock className="h-2 w-3" />
        <SwatchBar w="w-2/3" />
        <SwatchBar w="w-1/3" />
      </SwatchFrame>
    ),
  },
  {
    value: 'minimal',
    label: 'Minimal',
    preview: (
      <SwatchFrame className="items-center justify-between gap-1">
        <SwatchBar w="w-1/3" />
        <SwatchBar w="w-1/4" />
      </SwatchFrame>
    ),
  },
]

function MenuEditor({
  menu,
  onChange,
}: {
  menu: NavigationLink[]
  onChange: (menu: NavigationLink[]) => void
}) {
  const update = (index: number, field: keyof NavigationLink, value: string) => {
    const next = menu.map((link, i) => (i === index ? { ...link, [field]: value } : link))
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <label className={editorLabelClass}>Liens de navigation</label>
      <p className={editorHelpClass}>
        Définissez les liens affichés dans le header. Utilisez <code className="font-mono text-gray-500">/pages/…</code> pour vos pages personnalisées, <code className="font-mono text-gray-500">/catalogue</code> pour le catalogue, ou une URL complète pour un lien externe.
      </p>
      <div className="space-y-2">
        {menu.map((link, i) => (
          <div key={i} className="flex items-start gap-2">
            <input
              value={link.label}
              onChange={(e) => update(i, 'label', e.target.value)}
              placeholder="Libellé"
              className={`mt-0 flex-1 ${editorInputClass}`}
            />
            <input
              value={link.href}
              onChange={(e) => update(i, 'href', e.target.value)}
              placeholder="/pages/à-propos"
              className={`mt-0 w-40 ${editorInputClass} font-mono text-xs`}
            />
            <button
              type="button"
              onClick={() => onChange(menu.filter((_, idx) => idx !== i))}
              aria-label="Supprimer le lien"
              className="mt-1 shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...menu, { label: '', href: '' }])}
        className="flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:text-brand-800"
      >
        <Plus size={14} aria-hidden /> Ajouter un lien
      </button>
    </div>
  )
}

export function HeaderEditor({ config, onChange }: SectionEditorProps<HeaderSectionConfig>) {
  const menu = config.menu ?? []
  return (
    <div className="space-y-4">
      <div>
        <label className={editorLabelClass}>Disposition</label>
        <div className="mt-1">
          <VisualPicker
            columns={3}
            value={config.layout ?? 'left-logo'}
            onChange={(layout) => onChange({ ...config, layout })}
            options={HEADER_LAYOUTS}
          />
        </div>
        <p className={`mt-1.5 ${editorHelpClass}`}>
          « Logo centré » place les liens sous le logo ; « Réparti » met les liens à gauche, le logo au centre et le panier à droite.
        </p>
      </div>
      <MenuEditor
        menu={menu}
        onChange={(newMenu) => onChange({ ...config, menu: newMenu })}
      />
      <div className="border-t border-gray-200 pt-4">
        <label className={editorLabelClass}>Boutons classiques</label>
        <p className={`mb-2 ${editorHelpClass}`}>
          Affichés à droite. Désactivez-les si vous utilisez des liens personnalisés ci-dessus.
        </p>
        <div className="space-y-2">
          <label className={checkboxRow}>
            <input
              type="checkbox"
              checked={config.showCatalogLink}
              onChange={(e) => onChange({ ...config, showCatalogLink: e.target.checked })}
            />
            Lien "Catalogue"
          </label>
          <label className={checkboxRow}>
            <input
              type="checkbox"
              checked={config.showContactLink}
              onChange={(e) => onChange({ ...config, showContactLink: e.target.checked })}
            />
            Lien "Contact" (WhatsApp)
          </label>
        </div>
      </div>
      <div className="space-y-2 border-t border-gray-200 pt-4">
        <label className={checkboxRow}>
          <input
            type="checkbox"
            checked={config.showLogo}
            onChange={(e) => onChange({ ...config, showLogo: e.target.checked })}
          />
          Afficher le logo
        </label>
        <label className={checkboxRow}>
          <input
            type="checkbox"
            checked={config.sticky}
            onChange={(e) => onChange({ ...config, sticky: e.target.checked })}
          />
          Fixe en haut de l'écran au défilement
        </label>
      </div>
      <p className={editorHelpClass}>
        Le header s'affiche sur toutes les pages de votre boutique, pas seulement l'accueil.
      </p>
    </div>
  )
}

export function FooterEditor({ config, onChange, removableBranding }: SectionEditorProps<FooterSectionConfig>) {
  return (
    <div className="space-y-3">
      <div>
        <label className={editorLabelClass}>Disposition</label>
        <div className="mt-1">
          <VisualPicker
            columns={3}
            value={config.layout ?? 'columns'}
            onChange={(layout) => onChange({ ...config, layout })}
            options={FOOTER_LAYOUTS}
          />
        </div>
        <p className={`mt-1.5 ${editorHelpClass}`}>
          « Centré » empile tout au centre ; « Minimal » tient sur une seule ligne (sans bloc contact ni réseaux sociaux).
        </p>
      </div>
      <label className={checkboxRow}>
        <input
          type="checkbox"
          checked={config.showAddress}
          onChange={(e) => onChange({ ...config, showAddress: e.target.checked })}
        />
        Afficher l'adresse
      </label>
      <label className={checkboxRow}>
        <input
          type="checkbox"
          checked={config.showWhatsapp}
          onChange={(e) => onChange({ ...config, showWhatsapp: e.target.checked })}
        />
        Afficher le lien WhatsApp
      </label>
      <label className={checkboxRow}>
        <input
          type="checkbox"
          checked={config.showSocialLinks}
          onChange={(e) => onChange({ ...config, showSocialLinks: e.target.checked })}
        />
        Afficher les réseaux sociaux
      </label>
      <div>
        <label className={editorLabelClass}>Texte de copyright</label>
        <input
          value={config.copyrightText}
          onChange={(e) => onChange({ ...config, copyrightText: e.target.value })}
          placeholder="Laisser vide = © année · nom de la boutique"
          className={`${controlClass()} mt-1`}
        />
        <TextStyleField value={config.copyrightTextStyle} onChange={(copyrightTextStyle) => onChange({ ...config, copyrightTextStyle })} />
      </div>
      <div className="border-t border-gray-200 pt-3">
        <p className={`mb-2 ${editorHelpClass}`}>
          Sans réglage, le footer reprend automatiquement la couleur principale de la boutique (celle suggérée par votre logo), assombrie pour rester lisible — vous pouvez la remplacer ici.
        </p>
        <ColorField
          label="Couleur de fond"
          value={config.backgroundColor ?? ''}
          placeholder="Laisser vide = couleur principale assombrie"
          onChange={(backgroundColor) => onChange({ ...config, backgroundColor })}
        />
      </div>
      <div>
        <ColorField
          label="Couleur du bouton"
          value={config.buttonColor ?? ''}
          placeholder="Laisser vide = couleur des boutons du thème"
          onChange={(buttonColor) => onChange({ ...config, buttonColor })}
        />
      </div>
      <div>
        <ColorField
          label="Couleur du texte"
          value={config.textColor ?? ''}
          placeholder="Laisser vide = blanc cassé (par défaut)"
          onChange={(textColor) => onChange({ ...config, textColor })}
        />
      </div>
      {removableBranding ? (
        <label className={checkboxRow}>
          <input
            type="checkbox"
            checked={config.hideBitikoBranding ?? false}
            onChange={(e) => onChange({ ...config, hideBitikoBranding: e.target.checked })}
          />
          Masquer « Propulsé par Bitiko »
        </label>
      ) : (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          <Lock size={14} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            Masquer « Propulsé par Bitiko » est réservé au plan Pro.{' '}
            <Link to="/admin/parametres/facturation" className="font-semibold underline underline-offset-2 hover:text-amber-900">
              Passer à Pro
            </Link>
          </span>
        </div>
      )}
      <p className={editorHelpClass}>
        Le footer s'affiche sur toutes les pages. Les réseaux sociaux se règlent dans Paramètres → Contact.
      </p>
    </div>
  )
}
