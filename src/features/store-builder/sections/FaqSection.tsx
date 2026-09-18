import { useState } from 'react'
import { ChevronDown, HelpCircle, Plus, Trash2 } from 'lucide-react'
import type { FaqSectionConfig, ThemeConfig } from '@/types/builder'
import { SECTION_HEADING_SCALE } from '@/config/themeTokens'
import { editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'
import { useInlineEdit } from '../inline/useInlineEdit'
import { InlineText } from '../inline/InlineText'

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
  const items = editable ? config.items : config.items.filter((item) => item.question.trim() && item.answer.trim())
  if (items.length === 0 && !editable) return null

  const updateItem = (index: number, field: 'question' | 'answer', value: string) => {
    patch({ items: config.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)) })
  }

  return (
    <section className="mx-auto max-w-[min(48rem,var(--shop-content-width))] px-4 py-10 sm:px-6 sm:py-14">
      {(config.heading.trim() || editable) && (
        <InlineText
          as="h2"
          editable={editable}
          value={config.heading}
          onCommit={(heading) => patch({ heading })}
          placeholder="Questions fréquentes"
          className={`font-heading font-bold text-[var(--shop-text)] ${SECTION_HEADING_SCALE[themeConfig.textScale]}`}
          label="Titre"
        />
      )}
      <div className="mt-6 divide-y divide-ink-900/10 border-y border-ink-900/10">
        {items.map((item, index) => (
          <FaqItem
            key={index}
            question={item.question}
            answer={item.answer}
            editable={editable}
            onQuestionChange={(value) => updateItem(index, 'question', value)}
            onAnswerChange={(value) => updateItem(index, 'answer', value)}
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
  onQuestionChange,
  onAnswerChange,
  onRemove,
}: {
  question: string
  answer: string
  editable: boolean
  onQuestionChange: (value: string) => void
  onAnswerChange: (value: string) => void
  onRemove?: () => void
}) {
  const [open, setOpen] = useState(editable)
  return (
    <div className="group/faq relative">
      <button
        type="button"
        onClick={(e) => {
          if (editable) e.preventDefault()
          else setOpen((value) => !value)
        }}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-semibold text-[var(--shop-text)]"
      >
        <InlineText
          editable={editable}
          value={question}
          onCommit={onQuestionChange}
          placeholder="Question"
          className="flex-1"
          label="Question"
        />
        {!editable && (
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
        <InlineText
          as="p"
          editable={editable}
          value={answer}
          onCommit={onAnswerChange}
          placeholder="Réponse"
          className="pb-4 pr-8 text-sm leading-relaxed text-[var(--shop-text)]/65"
          multiline
          label="Réponse"
        />
      )}
    </div>
  )
}

export function FaqEditor({ config, onChange }: SectionEditorProps<FaqSectionConfig>) {
  const updateItem = (index: number, key: 'question' | 'answer', value: string) => {
    const items = config.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item)
    onChange({ ...config, items })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className={editorLabelClass}>Titre</label>
        <input value={config.heading} onChange={(e) => onChange({ ...config, heading: e.target.value })} placeholder="Questions fréquentes" className={editorInputClass} />
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
      <p className="flex items-center gap-1.5 text-xs text-gray-500"><HelpCircle size={13} /> Répondez aux questions qui bloquent le plus souvent vos clients.</p>
    </div>
  )
}
