import type { OptionField, SelectedOption } from '@/types'

export const MAX_OPTION_FIELDS = 6
export const MAX_OPTION_CHOICES = 20
export const MAX_OPTION_TEXT_LENGTH = 200

/** Parses `products.option_fields` (jsonb) defensively — the column is
 *  merchant-written data, so anything malformed is dropped rather than
 *  crashing the storefront. */
export function parseOptionFields(raw: unknown): OptionField[] {
  if (!Array.isArray(raw)) return []
  const fields: OptionField[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const f = item as Record<string, unknown>
    if (typeof f.id !== 'string' || typeof f.label !== 'string' || !f.label.trim()) continue
    const type = f.type === 'text' ? 'text' : 'choice'
    const choices = Array.isArray(f.choices) ? f.choices.filter((c): c is string => typeof c === 'string' && !!c.trim()) : []
    if (type === 'choice' && choices.length === 0) continue
    fields.push({ id: f.id, label: f.label.trim(), type, required: f.required === true, choices })
  }
  return fields
}

/** Values the customer is filling in, keyed by field id. */
export type OptionValues = Record<string, string>

/** Checks a customer's answers against the product's fields. Returns the
 *  selection to attach to the cart line, or the first problem found (for the
 *  UI to show). Mirrors the server-side check in `resolve_order_options`. */
export function resolveSelection(
  fields: OptionField[],
  values: OptionValues,
): { ok: true; options: SelectedOption[] } | { ok: false; error: string; fieldId: string } {
  const options: SelectedOption[] = []
  for (const field of fields) {
    const value = (values[field.id] ?? '').trim()
    if (!value) {
      if (field.required) return { ok: false, fieldId: field.id, error: `Choisissez : ${field.label}` }
      continue
    }
    if (value.length > MAX_OPTION_TEXT_LENGTH) return { ok: false, fieldId: field.id, error: `${field.label} est trop long` }
    if (field.type === 'choice' && !field.choices.includes(value)) {
      return { ok: false, fieldId: field.id, error: `Valeur invalide pour ${field.label}` }
    }
    options.push({ fieldId: field.id, label: field.label, value })
  }
  return { ok: true, options }
}

/** Stable identity of a set of picks, so the cart keeps "Ton: Rose" and
 *  "Ton: Bleu" of the same product as two separate lines. */
export function optionsKey(options: SelectedOption[] | undefined): string {
  if (!options || options.length === 0) return ''
  return options
    .map((o) => `${o.fieldId}=${o.value}`)
    .sort()
    .join('|')
}

/** "Ton : Rose · Taille : M" — one-line human summary. */
export function formatOptionsInline(options: { label: string; value: string }[] | null | undefined): string {
  if (!options || options.length === 0) return ''
  return options.map((o) => `${o.label} : ${o.value}`).join(' · ')
}

/** Reads `order_items.options` (jsonb snapshot) back into label/value pairs. */
export function parseOrderOptions(raw: unknown): { label: string; value: string }[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((o) => {
    if (!o || typeof o !== 'object') return []
    const { label, value } = o as Record<string, unknown>
    return typeof label === 'string' && typeof value === 'string' ? [{ label, value }] : []
  })
}
