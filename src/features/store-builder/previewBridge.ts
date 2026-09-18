// postMessage protocol between the builder's live preview iframe (parent,
// admin origin) and the actual storefront page it embeds (child, shop
// origin/subdomain). Lets every keystroke in the editor reflect instantly in
// the preview without writing the draft to the database on each change.
import type { LayoutSection, SystemTemplateKey, ThemeConfig } from '@/types/builder'

export const PREVIEW_READY = 'bitiko-preview-ready'
export const PREVIEW_UPDATE = 'bitiko-preview-update'
export const PREVIEW_SELECT = 'bitiko-preview-select'
export const PREVIEW_NAV = 'bitiko-preview-nav'
export const PREVIEW_INLINE_EDIT = 'bitiko-preview-inline-edit'

export interface PreviewUpdateMessage {
  type: typeof PREVIEW_UPDATE
  sections: LayoutSection[]
  themeColor: string
  themeConfig: ThemeConfig
  /** Which system template these sections belong to; absent for the home page. */
  templateKey?: 'home' | SystemTemplateKey
  /** Whether the preview should render its inline "click to edit directly"
   *  affordances. False while previewing a not-yet-applied template. */
  inlineEditable?: boolean
}

export interface PreviewReadyMessage {
  type: typeof PREVIEW_READY
}

/** Sent from the storefront preview iframe to the builder: the merchant
 * clicked a section and wants it selected in the editor. */
export interface PreviewSelectMessage {
  type: typeof PREVIEW_SELECT
  sectionId: string
}

/** Sent from the storefront preview iframe to the builder after an internal
 * navigation (e.g. clicking a product card) so the editor can switch to the
 * matching template ("suivre la page dans l'aperçu"). */
export interface PreviewNavMessage {
  type: typeof PREVIEW_NAV
  path: string
}

export function isPreviewUpdateMessage(data: unknown): data is PreviewUpdateMessage {
  return !!data && typeof data === 'object' && (data as { type?: unknown }).type === PREVIEW_UPDATE
}

export function isPreviewReadyMessage(data: unknown): data is PreviewReadyMessage {
  return !!data && typeof data === 'object' && (data as { type?: unknown }).type === PREVIEW_READY
}

export function isPreviewSelectMessage(data: unknown): data is PreviewSelectMessage {
  return !!data && typeof data === 'object' && (data as { type?: unknown }).type === PREVIEW_SELECT
}

export function isPreviewNavMessage(data: unknown): data is PreviewNavMessage {
  return !!data && typeof data === 'object' && (data as { type?: unknown }).type === PREVIEW_NAV
}

/** Sent from the storefront preview iframe to the builder: the merchant
 * edited a field directly in the live preview (inline text, a swapped image,
 * a button's label/link…). `patch` is shallow-merged onto that section's
 * current config, the same shape its sidebar Editor's `onChange` would send —
 * inline editing is just another way to reach the exact same config update,
 * so it round-trips through the normal PREVIEW_UPDATE channel and undo/redo
 * history like any other change. */
export interface PreviewInlineEditMessage {
  type: typeof PREVIEW_INLINE_EDIT
  sectionId: string
  patch: Record<string, unknown>
}

export function isPreviewInlineEditMessage(data: unknown): data is PreviewInlineEditMessage {
  return !!data && typeof data === 'object' && (data as { type?: unknown }).type === PREVIEW_INLINE_EDIT
}
