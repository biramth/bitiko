import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { PromoSectionConfig, ThemeConfig } from '@/types/builder'
import { SECTION_HEADING_SCALE } from '@/config/themeTokens'
import { editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'

function isExternal(url: string) {
  return /^https?:\/\//i.test(url)
}

export function PromoRenderer({ config, themeConfig }: { config: PromoSectionConfig; themeConfig: ThemeConfig }) {
  if (!config.heading.trim()) return null

  const button = config.buttonLabel.trim() && (
    <span
      className="mt-5 inline-flex items-center gap-2 bg-white px-5 py-2.5 text-sm font-semibold uppercase tracking-widest text-[var(--shop-accent)]"
      style={{ borderRadius: 'var(--shop-radius)' }}
    >
      {config.buttonLabel}
      <ArrowRight size={15} aria-hidden />
    </span>
  )

  return (
    <section className="mx-auto max-w-[var(--shop-content-width)] px-4 py-6 sm:px-6">
      <div
        className="flex flex-col items-start px-6 py-10 text-white sm:px-10"
        style={{ backgroundColor: config.backgroundColor || 'var(--shop-accent)', borderRadius: 'var(--shop-radius)' }}
      >
        <h2 className={`max-w-lg font-bold ${SECTION_HEADING_SCALE[themeConfig.textScale]}`} style={{ fontFamily: 'var(--shop-font-heading)' }}>
          {config.heading}
        </h2>
        {config.body.trim() && <p className="mt-2 max-w-md text-white/80">{config.body}</p>}
        {button &&
          (config.buttonLink && isExternal(config.buttonLink) ? (
            <a href={config.buttonLink} target="_blank" rel="noreferrer">
              {button}
            </a>
          ) : (
            <Link to={config.buttonLink || '/catalogue'}>{button}</Link>
          ))}
      </div>
    </section>
  )
}

export function PromoEditor({ config, onChange }: SectionEditorProps<PromoSectionConfig>) {
  return (
    <div className="space-y-4">
      <div>
        <label className={editorLabelClass}>Titre</label>
        <input
          value={config.heading}
          onChange={(e) => onChange({ ...config, heading: e.target.value })}
          placeholder="Soldes de fin d'année"
          className={editorInputClass}
        />
      </div>
      <div>
        <label className={editorLabelClass}>Texte</label>
        <textarea
          rows={2}
          value={config.body}
          onChange={(e) => onChange({ ...config, body: e.target.value })}
          className={editorInputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={editorLabelClass}>Texte du bouton</label>
          <input
            value={config.buttonLabel}
            onChange={(e) => onChange({ ...config, buttonLabel: e.target.value })}
            placeholder="Voir l'offre"
            className={editorInputClass}
          />
        </div>
        <div>
          <label className={editorLabelClass}>Lien du bouton</label>
          <input
            value={config.buttonLink}
            onChange={(e) => onChange({ ...config, buttonLink: e.target.value })}
            placeholder="/catalogue"
            className={editorInputClass}
          />
        </div>
      </div>
      <div>
        <label className={editorLabelClass}>Couleur de fond</label>
        <div className="mt-1 flex items-center gap-3">
          <input
            type="color"
            value={config.backgroundColor || '#d9612e'}
            onChange={(e) => onChange({ ...config, backgroundColor: e.target.value })}
            className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-gray-200 p-1"
          />
          <input
            value={config.backgroundColor}
            onChange={(e) => onChange({ ...config, backgroundColor: e.target.value })}
            placeholder="Laisser vide = couleur principale"
            className={`${editorInputClass} mt-0 max-w-[12rem] font-mono`}
          />
        </div>
      </div>
    </div>
  )
}
