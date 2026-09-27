import type { ComponentType } from 'react'
import { LayoutTemplate } from 'lucide-react'
import { CORE_SECTION_REGISTRY } from '@/features/store-builder/sectionRegistry'
import { themeConfigToCssVars, DEFAULT_THEME_CONFIG } from '@/config/themeTokens'
import type { ThemeConfig } from '@/types/builder'

export type Section = { id?: unknown; type?: unknown; config?: unknown }

const text = (value: unknown): string => (typeof value === 'string' ? value : '')
const record = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' ? (value as Record<string, unknown>) : {})
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

/** Un bloc générique (icône + libellé du registre + une note) pour les sections pilotées
 *  par des données réelles (produits, services, équipe…) qu'un aperçu statique ne simule pas. */
function GenericBlock({ label, Icon, colorClass, note }: { label: string; Icon: ComponentType<{ size?: number }>; colorClass: string; note?: string }) {
  return (
    <div className="border-y border-[var(--shop-border)] px-4 py-6">
      <div className="mx-auto max-w-sm">
        <div className={`mb-3 flex items-center gap-2 rounded-lg bg-gradient-to-br ${colorClass} px-3 py-2 text-xs font-semibold text-white`}>
          <Icon size={13} />
          {label}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-square rounded-md bg-[var(--shop-surface)]" />
          ))}
        </div>
        {note && <p className="mt-2 text-[11px] text-[var(--shop-text)]/45">{note}</p>}
      </div>
    </div>
  )
}

function SectionBlock({ section }: { section: Section }) {
  const type = text(section.type)
  const config = record(section.config)
  const def = CORE_SECTION_REGISTRY[type as keyof typeof CORE_SECTION_REGISTRY]
  const Icon = def?.icon ?? LayoutTemplate
  const colorClass = def?.color ?? 'from-gray-400 to-gray-600'
  const label = def?.label ?? (type || 'Bloc inconnu')

  switch (type) {
    case 'hero':
      return (
        <div className="px-4 py-10 text-center">
          {text(config.eyebrow) && (
            <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--shop-accent)]">{text(config.eyebrow)}</p>
          )}
          <h2 className="font-[var(--shop-font-heading)] text-xl font-bold">{text(config.heading) || 'Titre de la boutique'}</h2>
          {text(config.subheading) && <p className="mx-auto mt-2 max-w-xs text-sm text-[var(--shop-text)]/70">{text(config.subheading)}</p>}
        </div>
      )
    case 'announcement':
      return (
        <div className="px-4 py-2 text-center text-xs font-medium" style={{ backgroundColor: 'var(--shop-accent)', color: 'var(--shop-button-text)' }}>
          {text(config.message) || 'Message de la barre d’annonce'}
        </div>
      )
    case 'promo':
      return (
        <div className="mx-4 my-4 rounded-xl px-4 py-6 text-center" style={{ backgroundColor: text(config.backgroundColor) || 'var(--shop-secondary)' }}>
          <p className="font-[var(--shop-font-heading)] text-base font-bold">{text(config.heading) || 'Titre de la promotion'}</p>
          {text(config.body) && <p className="mt-1 text-sm text-[var(--shop-text)]/75">{text(config.body)}</p>}
          <span
            className="mt-3 inline-block px-4 py-1.5 text-xs font-semibold"
            style={{ borderRadius: 'var(--shop-radius)', backgroundColor: 'var(--shop-button)', color: 'var(--shop-button-text)' }}
          >
            {text(config.buttonLabel) || 'Bouton'}
          </span>
        </div>
      )
    case 'text':
      return (
        <div className={`px-4 py-6 ${config.align === 'center' ? 'text-center' : ''}`}>
          {text(config.heading) && <p className="font-[var(--shop-font-heading)] text-base font-bold">{text(config.heading)}</p>}
          <p className="mt-1 text-sm text-[var(--shop-text)]/75">{text(config.body) || 'Texte…'}</p>
        </div>
      )
    case 'faq': {
      const items = list(config.items).slice(0, 2).map(record)
      return (
        <div className="px-4 py-6">
          <p className="mb-3 text-center font-[var(--shop-font-heading)] text-base font-bold">{text(config.heading) || 'Questions fréquentes'}</p>
          <div className="mx-auto max-w-sm space-y-2">
            {(items.length > 0 ? items : [{ question: 'Question ?', answer: '' }]).map((item, i) => (
              <div key={i} className="rounded-lg border border-[var(--shop-border)] px-3 py-2 text-sm">
                {text(item.question) || 'Question ?'}
              </div>
            ))}
          </div>
        </div>
      )
    }
    case 'testimonials': {
      const items = list(config.items).slice(0, 2).map(record)
      return (
        <div className="px-4 py-6">
          <p className="mb-3 text-center font-[var(--shop-font-heading)] text-base font-bold">{text(config.heading) || 'Témoignages'}</p>
          <div className="mx-auto grid max-w-sm grid-cols-2 gap-2">
            {(items.length > 0 ? items : [{ name: '', text: '' }]).map((item, i) => (
              <div key={i} className="rounded-lg bg-[var(--shop-surface)] p-3 text-xs">
                <p className="italic text-[var(--shop-text)]/75">« {text(item.text) || 'Avis client…'} »</p>
                {text(item.name) && <p className="mt-1 font-semibold">{text(item.name)}</p>}
              </div>
            ))}
          </div>
        </div>
      )
    }
    case 'menu':
      return (
        <div className="px-4 py-6">
          <p className="mb-3 text-center font-[var(--shop-font-heading)] text-base font-bold">{text(config.heading) || 'La carte'}</p>
          <div className="mx-auto max-w-sm space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-[var(--shop-surface)] px-3 py-2 text-xs">
                <span className="h-2 w-24 rounded-full bg-current opacity-20" />
                {config.showPrices !== false && <span className="h-2 w-10 rounded-full bg-current opacity-20" />}
              </div>
            ))}
          </div>
        </div>
      )
    default:
      return <GenericBlock label={label} Icon={Icon} colorClass={colorClass} note="Aperçu structurel — données réelles non simulées ici." />
  }
}

/**
 * Aperçu statique (aucun appel réseau, aucune donnée de boutique) d'un contenu de
 * template : couleurs et police réelles (mêmes variables CSS que le vrai storefront,
 * voir `themeConfigToCssVars`), ordre des blocs réel, textes réels pour les sections
 * éditoriales (hero, promo, texte, FAQ, témoignages…). Les sections pilotées par des
 * données (produits, services, équipe…) restent des blocs génériques — ce n'est pas
 * un rendu final, juste de quoi juger la mise en page et les couleurs avant d'enregistrer.
 */
export function TemplateContentPreview({
  themeColor,
  themeConfig,
  home,
}: {
  themeColor: string
  themeConfig: ThemeConfig
  home: Section[]
}) {
  const vars = themeConfigToCssVars(themeColor || '#d9612e', { ...DEFAULT_THEME_CONFIG, ...themeConfig })
  const header = home.find((s) => text(s.type) === 'header')
  const footer = home.find((s) => text(s.type) === 'footer')
  const body = home.filter((s) => text(s.type) !== 'header' && text(s.type) !== 'footer')
  const footerConfig = record(footer?.config)

  return (
    <div
      className="overflow-hidden rounded-xl border border-[var(--shop-border)] bg-[var(--shop-bg)] text-[var(--shop-text)]"
      style={vars as React.CSSProperties}
    >
      {header && (
        <div className="flex items-center justify-between border-b border-[var(--shop-border)] px-4 py-3">
          <span className="h-3 w-16 rounded-full" style={{ backgroundColor: 'var(--shop-accent)' }} />
          <span className="flex gap-3">
            <span className="h-2 w-8 rounded-full bg-current opacity-20" />
            <span className="h-2 w-8 rounded-full bg-current opacity-20" />
          </span>
        </div>
      )}

      <div className="divide-y divide-[var(--shop-border)]">
        {body.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--shop-text)]/50">Aucun bloc dans layout.home.</p>
        ) : (
          body.map((section, i) => <SectionBlock key={text(section.id) || i} section={section} />)
        )}
      </div>

      {footer && (
        <div className="border-t border-[var(--shop-border)] px-4 py-4 text-center text-[11px] text-[var(--shop-text)]/50">
          {text(footerConfig.copyrightText) || '© Ta boutique'}
        </div>
      )}
    </div>
  )
}
