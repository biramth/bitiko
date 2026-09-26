import type { Dispatch, SetStateAction } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import type { OptionField } from '@/types'
import { controlClass } from '@/components/ui/styles'
import { MAX_OPTION_CHOICES, MAX_OPTION_FIELDS } from '@/utils/productOptions'
import { inputClass, newOptionFieldId } from '@/features/products/productFormHelpers'

/** Champs que le client doit préciser avant de commander (ton, taille, prénom à broder…). État contrôlé par le formulaire. */
export function OptionFieldsEditor({ fields, setFields }: { fields: OptionField[]; setFields: Dispatch<SetStateAction<OptionField[]>> }) {
  const updateOptionField = (fieldId: string, patch: Partial<OptionField>) =>
    setFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)))

  const addOptionField = () => {
    if (fields.length >= MAX_OPTION_FIELDS) return
    setFields((prev) => [
      ...prev,
      { id: newOptionFieldId(), label: '', type: 'choice', required: false, choices: [] },
    ])
  }

  const moveOptionField = (index: number, delta: number) =>
    setFields((prev) => {
      const target = index + delta
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })

  const updateOptionChoice = (fieldId: string, choiceIndex: number, value: string) =>
    setFields((prev) =>
      prev.map((f) =>
        f.id === fieldId
          ? { ...f, choices: f.choices.map((c, i) => (i === choiceIndex ? value : c)) }
          : f,
      ),
    )

  const addOptionChoice = (fieldId: string) => {
    const field = fields.find((f) => f.id === fieldId)
    if (!field || field.choices.length >= MAX_OPTION_CHOICES) return
    const nextIndex = field.choices.length
    updateOptionField(fieldId, { choices: [...field.choices, ''] })
    setTimeout(() => {
      document
        .querySelector<HTMLInputElement>(`[data-opt-choice="${fieldId}-${nextIndex}"]`)
        ?.focus()
    }, 0)
  }

  return (
    <>
              {fields.length > 0 && (
                <ul className="space-y-3">
                  {fields.map((field, index) => (
                    <li key={field.id} className="rounded-lg border border-gray-200 p-3">
                      <div className="flex items-end gap-2">
                        <div className="min-w-0 flex-1">
                          <label
                            htmlFor={`opt-label-${field.id}`}
                            className="block text-sm font-medium text-gray-700"
                          >
                            Nom du champ
                          </label>
                          <input
                            id={`opt-label-${field.id}`}
                            type="text"
                            value={field.label}
                            onChange={(e) => updateOptionField(field.id, { label: e.target.value })}
                            placeholder="Ex. Ton, Taille, Prénom à broder"
                            className={inputClass}
                          />
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => moveOptionField(index, -1)}
                            disabled={index === 0}
                            aria-label={`Monter le champ ${field.label || index + 1}`}
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:border-brand-300 disabled:opacity-40"
                          >
                            <ArrowUp size={16} aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveOptionField(index, 1)}
                            disabled={index === fields.length - 1}
                            aria-label={`Descendre le champ ${field.label || index + 1}`}
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:border-brand-300 disabled:opacity-40"
                          >
                            <ArrowDown size={16} aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setFields((prev) => prev.filter((f) => f.id !== field.id))
                            }
                            aria-label={`Supprimer le champ ${field.label || index + 1}`}
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-red-600 hover:border-red-300"
                          >
                            <Trash2 size={16} aria-hidden />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                        <select
                          value={field.type}
                          onChange={(e) =>
                            updateOptionField(field.id, {
                              type: e.target.value === 'text' ? 'text' : 'choice',
                            })
                          }
                          aria-label="Type de champ"
                          className={`${controlClass()} min-h-10 sm:w-auto`}
                        >
                          <option value="choice">Choix dans une liste</option>
                          <option value="text">Texte libre</option>
                        </select>
                        <label className="flex min-h-10 items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => updateOptionField(field.id, { required: e.target.checked })}
                            className="h-5 w-5 rounded border-gray-300"
                          />
                          Obligatoire
                        </label>
                      </div>

                      {field.type === 'choice' ? (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs text-gray-500">Le client choisira une de ces options.</p>
                          {field.choices.map((choice, ci) => (
                            <div key={ci} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={choice}
                                data-opt-choice={`${field.id}-${ci}`}
                                onChange={(e) => updateOptionChoice(field.id, ci, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    if (ci === field.choices.length - 1) addOptionChoice(field.id)
                                  }
                                }}
                                placeholder={`Option ${ci + 1}`}
                                aria-label={`Option ${ci + 1} de ${field.label || 'ce champ'}`}
                                className={`${controlClass()} min-h-10 min-w-0`}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  updateOptionField(field.id, {
                                    choices: field.choices.filter((_, i) => i !== ci),
                                  })
                                }
                                aria-label={`Supprimer l'option ${ci + 1}`}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-red-600 hover:border-red-300"
                              >
                                <Trash2 size={15} aria-hidden />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addOptionChoice(field.id)}
                            disabled={field.choices.length >= MAX_OPTION_CHOICES}
                            className="flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-brand-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Plus size={15} aria-hidden /> Ajouter une option
                          </button>
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-gray-500">
                          Le client saisira librement sa réponse (200 caractères max).
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={addOptionField}
                disabled={fields.length >= MAX_OPTION_FIELDS}
                className="flex min-h-10 items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-gray-300 disabled:hover:text-gray-600"
              >
                <Plus size={16} aria-hidden />
                Ajouter un champ
              </button>
              {fields.length >= MAX_OPTION_FIELDS && (
                <p className="text-xs text-amber-600">
                  Maximum {MAX_OPTION_FIELDS} champs par produit.
                </p>
              )}
    </>
  )
}
