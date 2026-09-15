import type { FooterSectionConfig, HeaderSectionConfig } from '@/types/builder'
import { editorLabelClass, type SectionEditorProps } from './shared'

const checkboxRow = 'flex items-center gap-2 text-sm text-gray-700'

export function HeaderEditor({ config, onChange }: SectionEditorProps<HeaderSectionConfig>) {
  return (
    <div className="space-y-3">
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
      <label className={checkboxRow}>
        <input
          type="checkbox"
          checked={config.sticky}
          onChange={(e) => onChange({ ...config, sticky: e.target.checked })}
        />
        Fixe en haut de l'écran au défilement
      </label>
      <p className="text-xs text-gray-500">
        Le header s'affiche sur toutes les pages de votre boutique, pas seulement l'accueil.
      </p>
    </div>
  )
}

export function FooterEditor({ config, onChange }: SectionEditorProps<FooterSectionConfig>) {
  return (
    <div className="space-y-3">
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
          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none"
        />
      </div>
      <p className="text-xs text-gray-500">
        Le footer s'affiche sur toutes les pages. Les réseaux sociaux se règlent dans Paramètres → Contact.
      </p>
    </div>
  )
}
