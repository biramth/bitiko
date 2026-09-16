import { Link } from 'react-router-dom'
import { Lock, Plus, Trash2 } from 'lucide-react'
import type { FooterSectionConfig, HeaderSectionConfig, NavigationLink } from '@/types/builder'
import { editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'

const checkboxRow = 'flex items-center gap-2 text-sm text-gray-700'

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
      <p className="text-xs text-gray-400">
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
      <MenuEditor
        menu={menu}
        onChange={(newMenu) => onChange({ ...config, menu: newMenu })}
      />
      <div className="border-t border-gray-200 pt-4">
        <label className={editorLabelClass}>Boutons classiques</label>
        <p className="mb-2 text-xs text-gray-400">
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
      <p className="text-xs text-gray-500">
        Le header s'affiche sur toutes les pages de votre boutique, pas seulement l'accueil.
      </p>
    </div>
  )
}

export function FooterEditor({ config, onChange, removableBranding }: SectionEditorProps<FooterSectionConfig>) {
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
            <Link to="/admin/facturation" className="font-semibold underline underline-offset-2 hover:text-amber-900">
              Passer à Pro
            </Link>
          </span>
        </div>
      )}
      <p className="text-xs text-gray-500">
        Le footer s'affiche sur toutes les pages. Les réseaux sociaux se règlent dans Paramètres → Contact.
      </p>
    </div>
  )
}
