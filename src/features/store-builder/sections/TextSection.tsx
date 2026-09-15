import type { TextSectionConfig } from '@/types/builder'
import { editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'

export function TextRenderer({ config }: { config: TextSectionConfig }) {
  if (!config.heading.trim() && !config.body.trim()) return null
  const align = config.align === 'center' ? 'text-center mx-auto' : 'text-left'

  return (
    <section className="mx-auto max-w-[var(--shop-content-width)] px-4 py-10 sm:px-6">
      <div className={`max-w-2xl ${align}`}>
        {config.heading.trim() && (
          <h2
            className="font-bold text-[var(--shop-text)] text-2xl sm:text-3xl"
            style={{ fontFamily: 'var(--shop-font-heading)' }}
          >
            {config.heading}
          </h2>
        )}
        {config.body.trim() && (
          <p className="mt-3 whitespace-pre-line text-[var(--shop-text)]/70">{config.body}</p>
        )}
      </div>
    </section>
  )
}

export function TextEditor({ config, onChange }: SectionEditorProps<TextSectionConfig>) {
  return (
    <div className="space-y-4">
      <div>
        <label className={editorLabelClass}>Titre</label>
        <input
          value={config.heading}
          onChange={(e) => onChange({ ...config, heading: e.target.value })}
          className={editorInputClass}
        />
      </div>
      <div>
        <label className={editorLabelClass}>Texte</label>
        <textarea
          rows={4}
          value={config.body}
          onChange={(e) => onChange({ ...config, body: e.target.value })}
          className={editorInputClass}
        />
      </div>
      <div>
        <label className={editorLabelClass}>Alignement</label>
        <select
          value={config.align}
          onChange={(e) => onChange({ ...config, align: e.target.value as 'left' | 'center' })}
          className={editorInputClass}
        >
          <option value="left">Gauche</option>
          <option value="center">Centré</option>
        </select>
      </div>
    </div>
  )
}
