import type { AnnouncementBarSectionConfig } from '@/types/builder'
import { editorHelpClass, editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'
import { TextStyleField } from '../components/TextStyleControls'
import { ColorField } from '../components/ColorField'
import { VisualPicker } from '../components/VisualPicker'
import { SwatchBar, SwatchFrame } from '../components/LayoutSwatch'
import type { AnnouncementLayout } from '@/types/builder'

const checkboxRow = 'flex items-center gap-2 text-sm text-gray-700'

const ANNOUNCEMENT_LAYOUTS: { value: AnnouncementLayout; label: string; preview: React.ReactNode }[] = [
  {
    value: 'bar',
    label: 'Bandeau',
    preview: (
      <SwatchFrame className="flex-col justify-start">
        <span className="flex h-2 w-full items-center justify-center rounded-[2px] bg-current opacity-30">
          <SwatchBar w="w-1/2" className="!bg-white" />
        </span>
      </SwatchFrame>
    ),
  },
  {
    value: 'pill',
    label: 'Pastille',
    preview: (
      <SwatchFrame className="flex-col items-center justify-start pt-1.5">
        <span className="flex h-2 w-2/3 items-center justify-center rounded-full bg-current opacity-30">
          <SwatchBar w="w-1/2" className="!bg-white" />
        </span>
      </SwatchFrame>
    ),
  },
]

export function AnnouncementBarEditor({ config, onChange }: SectionEditorProps<AnnouncementBarSectionConfig>) {
  return (
    <div className="space-y-4">
      <div>
        <label className={editorLabelClass}>Disposition</label>
        <div className="mt-1">
          <VisualPicker
            columns={2}
            value={config.layout ?? 'bar'}
            onChange={(layout) => onChange({ ...config, layout })}
            options={ANNOUNCEMENT_LAYOUTS}
          />
        </div>
        <p className={`mt-1.5 ${editorHelpClass}`}>« Pastille » affiche le message dans une bulle centrée plutôt que sur toute la largeur.</p>
      </div>
      <div>
        <label className={editorLabelClass}>Message</label>
        <input
          value={config.message}
          onChange={(e) => onChange({ ...config, message: e.target.value })}
          placeholder="Laisser vide = barre masquée"
          className={editorInputClass}
        />
        <p className={`mt-1 ${editorHelpClass}`}>
          Livraison offerte, promotion en cours, fermeture exceptionnelle… La barre n'apparaît que si ce champ est rempli.
        </p>
        <TextStyleField value={config.messageStyle} onChange={(messageStyle) => onChange({ ...config, messageStyle })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={editorLabelClass}>Texte du lien (optionnel)</label>
          <input
            value={config.linkLabel}
            onChange={(e) => onChange({ ...config, linkLabel: e.target.value })}
            placeholder="En profiter"
            className={editorInputClass}
          />
          <TextStyleField label="Style" value={config.linkLabelStyle} onChange={(linkLabelStyle) => onChange({ ...config, linkLabelStyle })} />
        </div>
        <div>
          <label className={editorLabelClass}>Lien</label>
          <input
            value={config.linkUrl}
            onChange={(e) => onChange({ ...config, linkUrl: e.target.value })}
            placeholder="/catalogue"
            className={editorInputClass}
          />
        </div>
      </div>
      <label className={checkboxRow}>
        <input
          type="checkbox"
          checked={config.dismissible}
          onChange={(e) => onChange({ ...config, dismissible: e.target.checked })}
        />
        Le client peut la fermer (elle ne réapparaît plus sur son appareil)
      </label>
      <div className="border-t border-gray-200 pt-3">
        <p className={`mb-2 ${editorHelpClass}`}>
          Sans réglage, la barre reprend la couleur principale de la boutique.
        </p>
        <ColorField
          label="Couleur de fond"
          value={config.backgroundColor ?? ''}
          placeholder="Laisser vide = couleur principale"
          onChange={(backgroundColor) => onChange({ ...config, backgroundColor })}
        />
      </div>
      <div>
        <ColorField
          label="Couleur du texte"
          value={config.textColor ?? ''}
          placeholder="Laisser vide = blanc"
          onChange={(textColor) => onChange({ ...config, textColor })}
        />
      </div>
      <p className="text-xs text-gray-500">
        La barre s'affiche en haut de toutes les pages, au-dessus du header.
      </p>
    </div>
  )
}
