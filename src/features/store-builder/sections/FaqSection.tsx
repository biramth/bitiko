import { useState } from 'react'
import { ChevronDown, HelpCircle, Plus, Trash2 } from 'lucide-react'
import type { FaqSectionConfig, ThemeConfig } from '@/types/builder'
import { SECTION_HEADING_SCALE } from '@/config/themeTokens'
import { editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'

export function FaqRenderer({ config, themeConfig }: { config: FaqSectionConfig; themeConfig: ThemeConfig }) {
  const items = config.items.filter((item) => item.question.trim() && item.answer.trim())
  if (items.length === 0) return null

  return (
    <section className="mx-auto max-w-[min(48rem,var(--shop-content-width))] px-4 py-10 sm:px-6 sm:py-14">
      {config.heading.trim() && (
        <h2 className={`font-heading font-bold text-[var(--shop-text)] ${SECTION_HEADING_SCALE[themeConfig.textScale]}`}>{config.heading}</h2>
      )}
      <div className="mt-6 divide-y divide-ink-900/10 border-y border-ink-900/10">
        {items.map((item, index) => <FaqItem key={`${item.question}-${index}`} question={item.question} answer={item.answer} />)}
      </div>
    </section>
  )
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-semibold text-[var(--shop-text)]">
        <span>{question}</span>
        <ChevronDown size={17} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && <p className="pb-4 pr-8 text-sm leading-relaxed text-[var(--shop-text)]/65">{answer}</p>}
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
