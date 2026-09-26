import type { OptionField } from '@/types'

export const inputClass =
  'mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none'

export interface VariantDraft {
  key: string
  id?: string
  name: string
  sku: string
  price: string
  stock: string
  active: boolean
  /** Persisted photo (already uploaded to Storage). */
  imageUrl: string | null
  /** Photo picked but not uploaded yet — upload happens at save. */
  photoFile?: File
  /** Object URL for a just-picked photo (revoked when the draft is replaced). */
  photoPreviewUrl?: string
  /** User removed an existing photo → persisted by clearing image_url at save. */
  photoCleared?: boolean
}

let variantKeyCounter = 0
export function nextVariantKey() {
  variantKeyCounter += 1
  return `variant-${variantKeyCounter}`
}

export function newOptionFieldId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    // fall through
  }
  return `f${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

export function normalizeOptionFields(fields: OptionField[]): OptionField[] {
  return fields.map((f) => {
    const choices: string[] = []
    if (f.type === 'choice') {
      const seen = new Set<string>()
      for (const c of f.choices) {
        const t = c.trim()
        if (t && !seen.has(t.toLowerCase())) {
          seen.add(t.toLowerCase())
          choices.push(t)
        }
      }
    }
    return { id: f.id, label: f.label.trim(), type: f.type, required: f.required, choices }
  })
}
