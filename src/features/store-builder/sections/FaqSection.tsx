import { useState } from 'react'
import { ChevronDown, HelpCircle, Plus, Trash2 } from 'lucide-react'
import type { FaqLayout, FaqSectionConfig, ThemeConfig } from '@/types/builder'
import { SECTION_HEADING_SCALE } from '@/config/themeTokens'
import { editorHelpClass, editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'
import { useInlineEdit } from '../inline/useInlineEdit'
import { InlineText } from '../inline/InlineText'
import { InlineStyleToolbar } from '../inline/InlineStyleToolbar'
import { TextStyleField } from '../components/TextStyleControls'
import { VisualPicker } from '../components/VisualPicker'
import { SwatchBar, SwatchFrame } from '../components/LayoutSwatch'
import { resolveTextStyle } from '@/config/textStyle'

export function FaqRenderer({
  config,
  themeConfig,
  sectionId,
  editable = false,
}: {
  config: FaqSectionConfig
  themeConfig: ThemeConfig
  sectionId?: string
  editable?: boolean
}) {
  const patch = useInlineEdit(sectionId)
  const grid = (config.layout ?? 'accordion') === 'grid'
  const items = editable ? config.items : config.items.filter((item) => item.question.trim() && item.answer.trim())
  if (items.length === 0 && !editable) return null

  const updateItem = (index: number, field: 'question' | 'answer', value: string) => {
    patch({ items: config.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)) })
  }

  return (
    <section
      className={`mx-auto px-4 py-10 sm:px-6 sm:py-14 ${grid ? 'max-w-[var(--shop-content-width)]' : 'max-w-[min(48rem,var(--shop-content-width))]'}`}
    >
      {(config.heading.trim() || editable) && (
        <InlineStyleToolbar editable={editable} style={config.headingStyle} onCommit={(headingStyle) => patch({ headingStyle })} label="Style du titre">
          <InlineText
            as="h2"
            editable={editable}
            value={config.heading}
            onCommit={(heading) => patch({ heading })}
            placeholder="Questions fréquentes"
            className={`font-heading font-bold text-[var(--shop-text)] ${SECTION_HEADING_SCALE[themeConfig.textScale]}`}
            style={resolveTextStyle(config.headingStyle)}
            label="Titre"
          />
        </InlineStyleToolbar>
      )}
      <div
        className={
          grid ? 'mt-6 grid gap-4 md:grid-cols-2' : 'mt-6 divide-y divide-ink-900/10 border-y border-ink-900/10'
        }
      >
        {items.map((item, index) => (
          <FaqItem
            key={index}
            question={item.question}
            answer={item.answer}
            editable={editable}
            grid={grid}
            questionStyle={config.questionStyle}
            answerStyle={config.answerStyle}
            onQuestionChange={(value) => updateItem(index, 'question', value)}
            onAnswerChange={(value) => updateItem(index, 'answer', value)}
            onQuestionStyleChange={(questionStyle) => patch({ questionStyle })}
            onAnswerStyleChange={(answerStyle) => patch({ answerStyle })}
            onRemove={config.items.length > 1 ? () => patch({ items: config.items.filter((_, i) => i !== index) }) : undefined}
          />
        ))}
      </div>
      {editable && (
        <button
          type="button"
          onClick={() => patch({ items: [...config.items, { question: 'Nouvelle question', answer: 'Réponse…' }] })}
          className="mt-4 flex items-center gap-1.5 text-sm font-medium text-[var(--shop-accent)] hover:opacity-80"
        >
          <Plus size={15} aria-hidden /> Ajouter une question
        </button>
      )}
    </section>
  )
}

function FaqItem({
  question,
  answer,
  editable,
  grid,
  questionStyle,
  answerStyle,
  onQuestionChange,
  onAnswerChange,
  onQuestionStyleChange,
  onAnswerStyleChange,
  onRemove,
}: {
  question: string
  answer: string
  editable: boolean
  grid: boolean
  questionStyle: FaqSectionConfig['questionStyle']
  answerStyle: FaqSectionConfig['answerStyle']
  onQuestionChange: (value: string) => void
  onAnswerChange: (value: string) => void
  onQuestionStyleChange: (style: FaqSectionConfig['questionStyle']) => void
  onAnswerStyleChange: (style: FaqSectionConfig['answerStyle']) => void
  onRemove?: () => void
}) {
  const [openState, setOpen] = useState(editable)
  // Grid layout: every answer is always visible, nothing to toggle.
  const open = grid || openState
  return (
    <div
      className={`group/faq relative ${grid ? 'border border-ink-900/10 px-4' : ''}`}
      style={grid ? { borderRadius: 'var(--shop-radius)' } : undefined}
    >
      <button
        type="button"
        onClick={(e) => {
          if (editable) e.preventDefault()
          else if (!grid) setOpen((value) => !value)
        }}
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-semibold text-[var(--shop-text)] ${grid ? 'cursor-default' : ''}`}
      >
        <InlineStyleToolbar editable={editable} display="inline" style={questionStyle} onCommit={onQuestionStyleChange} label="Style des questions (toutes)">
          <InlineText
            editable={editable}
            value={question}
            onCommit={onQuestionChange}
            placeholder="Question"
            className="flex-1"
            style={resolveTextStyle(questionStyle)}
            label="Question"
          />
        </InlineStyleToolbar>
        {!editable && !grid && (
          <ChevronDown size={17} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
        )}
        {editable && onRemove && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onRemove()
            }}
            aria-label="Supprimer cette question"
            className="shrink-0 rounded p-1 text-[var(--shop-text)]/30 opacity-0 transition-opacity group-hover/faq:opacity-100 hover:text-red-600"
          >
            <Trash2 size={14} aria-hidden />
          </span>
        )}
      </button>
      {open && (
        <InlineStyleToolbar editable={editable} style={answerStyle} onCommit={onAnswerStyleChange} label="Style des réponses (toutes)">
          <InlineText
            as="p"
            editable={editable}
            value={answer}
            onCommit={onAnswerChange}
            placeholder="Réponse"
            className="pb-4 pr-8 text-sm leading-relaxed text-[var(--shop-text)]/65"
            style={resolveTextStyle(answerStyle)}
            multiline
            label="Réponse"
          />
        </InlineStyleToolbar>
      )}
    </div>
  )
}

const FAQ_LAYOUTS: { value: FaqLayout; label: string; preview: React.ReactNode }[] = [
  {
    value: 'accordion',
    label: 'Accordéon',
    preview: (
      <SwatchFrame className="flex-col justify-center gap-1">
        <SwatchBar />
        <SwatchBar />
        <SwatchBar />
      </SwatchFrame>
    ),
  },
  {
    value: 'grid',
    label: 'Grille',
    preview: (
      <SwatchFrame className="items-center gap-1">
        <span className="flex w-1/2 flex-col gap-1">
          <SwatchBar />
          <SwatchBar w="w-2/3" />
        </span>
        <span className="flex w-1/2 flex-col gap-1">
          <SwatchBar />
          <SwatchBar w="w-2/3" />
        </span>
      </SwatchFrame>
    ),
  },
]

export function FaqEditor({ config, onChange }: SectionEditorProps<FaqSectionConfig>) {
  const updateItem = (index: number, key: 'question' | 'answer', value: string) => {
    const items = config.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item)
    onChange({ ...config, items })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className={editorLabelClass}>Disposition</label>
        <div className="mt-1">
          <VisualPicker
            columns={2}
            value={config.layout ?? 'accordion'}
            onChange={(layout) => onChange({ ...config, layout })}
            options={FAQ_LAYOUTS}
          />
        </div>
        <p className={`mt-1.5 ${editorHelpClass}`}>
          « Grille » affiche toutes les réponses sur deux colonnes, sans avoir à cliquer.
        </p>
      </div>
      <div>
        <label className={editorLabelClass}>Titre</label>
        <input value={config.heading} onChange={(e) => onChange({ ...config, heading: e.target.value })} placeholder="Questions fréquentes" className={editorInputClass} />
        <p className={`mt-1 ${editorHelpClass}`}>Vide = pas de titre au-dessus des questions.</p>
        <TextStyleField value={config.headingStyle} onChange={(headingStyle) => onChange({ ...config, headingStyle })} />
      </div>
      <div className="space-y-2">
        <TextStyleField label="Style des questions" value={config.questionStyle} onChange={(questionStyle) => onChange({ ...config, questionStyle })} />
        <TextStyleField label="Style des réponses" value={config.answerStyle} onChange={(answerStyle) => onChange({ ...config, answerStyle })} />
        <p className={editorHelpClass}>Ces styles s'appliquent à toutes les questions et réponses.</p>
      </div>
      {config.items.map((item, index) => (
        <div key={index} className="space-y-2 rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Question {index + 1}</span>
            {config.items.length > 1 && <button type="button" onClick={() => onChange({ ...config, items: config.items.filter((_, itemIndex) => itemIndex !== index) })} aria-label={`Supprimer la question ${index + 1}`} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>}
          </div>
          <input value={item.question} onChange={(e) => updateItem(index, 'question', e.target.value)} placeholder="Comment fonctionne la livraison ?" className={editorInputClass} />
          <textarea rows={3} value={item.answer} onChange={(e) => updateItem(index, 'answer', e.target.value)} placeholder="Réponse visible par vos clients…" className={editorInputClass} />
        </div>
      ))}
      {config.items.length < 8 && <button type="button" onClick={() => onChange({ ...config, items: [...config.items, { question: '', answer: '' }] })} className="flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"><Plus size={15} /> Ajouter une question</button>}
      <p className={`flex items-center gap-1.5 ${editorHelpClass}`}><HelpCircle size={13} /> Répondez aux questions qui bloquent le plus souvent vos clients. Une question sans réponse n'est pas affichée.</p>
    </div>
  )
}
