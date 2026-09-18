import type { AnnouncementBarSectionConfig } from '@/types/builder'
import { editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'

const checkboxRow = 'flex items-center gap-2 text-sm text-gray-700'

export function AnnouncementBarEditor({ config, onChange }: SectionEditorProps<AnnouncementBarSectionConfig>) {
  return (
    <div className="space-y-4">
      <div>
        <label className={editorLabelClass}>Message</label>
        <input
          value={config.message}
          onChange={(e) => onChange({ ...config, message: e.target.value })}
          placeholder="Laisser vide = barre masquée"
          className={editorInputClass}
        />
        <p className="mt-1 text-xs text-gray-400">
          Livraison offerte, promotion en cours, fermeture exceptionnelle… La barre n'apparaît que si ce champ est rempli.
        </p>
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
        <p className="mb-2 text-xs text-gray-400">
          Sans réglage, la barre reprend la couleur principale de la boutique.
        </p>
        <label className={editorLabelClass}>Couleur de fond</label>
        <div className="mt-1 flex items-center gap-3">
          <input
            type="color"
            value={config.backgroundColor || '#d9612e'}
            onChange={(e) => onChange({ ...config, backgroundColor: e.target.value })}
            className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-gray-200 p-1"
          />
          <input
            value={config.backgroundColor ?? ''}
            onChange={(e) => onChange({ ...config, backgroundColor: e.target.value })}
            placeholder="Laisser vide = couleur principale"
            className={`${editorInputClass} mt-0 max-w-[14rem] font-mono`}
          />
        </div>
      </div>
      <div>
        <label className={editorLabelClass}>Couleur du texte</label>
        <div className="mt-1 flex items-center gap-3">
          <input
            type="color"
            value={config.textColor || '#ffffff'}
            onChange={(e) => onChange({ ...config, textColor: e.target.value })}
            className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-gray-200 p-1"
          />
          <input
            value={config.textColor ?? ''}
            onChange={(e) => onChange({ ...config, textColor: e.target.value })}
            placeholder="Laisser vide = blanc"
            className={`${editorInputClass} mt-0 max-w-[14rem] font-mono`}
          />
        </div>
      </div>
      <p className="text-xs text-gray-500">
        La barre s'affiche en haut de toutes les pages, au-dessus du header.
      </p>
    </div>
  )
}
