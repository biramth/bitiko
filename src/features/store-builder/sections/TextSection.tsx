import type { TextSectionConfig, ThemeConfig } from '@/types/builder'
import { SECTION_HEADING_SCALE } from '@/config/themeTokens'
import { editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'
import { useInlineEdit } from '../inline/useInlineEdit'
import { InlineText } from '../inline/InlineText'

export function TextRenderer({
  config,
  themeConfig,
  sectionId,
  editable = false,
}: {
  config: TextSectionConfig
  themeConfig: ThemeConfig
  sectionId?: string
  editable?: boolean
}) {
  const patch = useInlineEdit(sectionId)
  if (!editable && !config.heading.trim() && !config.body.trim()) return null
  const align = config.align === 'center' ? 'text-center mx-auto' : 'text-left'

  return (
    <section className="mx-auto max-w-[var(--shop-content-width)] px-4 py-10 sm:px-6">
      <div className={`max-w-2xl ${align}`}>
        {(config.heading.trim() || editable) && (
          <InlineText
            as="h2"
            editable={editable}
            value={config.heading}
            onCommit={(heading) => patch({ heading })}
            placeholder="Titre"
            className={`font-bold text-[var(--shop-text)] ${SECTION_HEADING_SCALE[themeConfig.textScale]}`}
            style={{ fontFamily: 'var(--shop-font-heading)' }}
            label="Titre"
          />
        )}
        {(config.body.trim() || editable) && (
          <InlineText
            as="p"
            editable={editable}
            value={config.body}
            onCommit={(body) => patch({ body })}
            placeholder="Texte"
            className="mt-3 whitespace-pre-line text-[var(--shop-text)]/70"
            multiline
            label="Texte"
          />
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
