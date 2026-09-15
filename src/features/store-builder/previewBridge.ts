// postMessage protocol between the builder's live preview iframe (parent,
// admin origin) and the actual storefront page it embeds (child, shop
// origin/subdomain). Lets every keystroke in the editor reflect instantly in
// the preview without writing the draft to the database on each change.
import type { LayoutSection, ThemeConfig } from '@/types/builder'

export const PREVIEW_READY = 'bitiko-preview-ready'
export const PREVIEW_UPDATE = 'bitiko-preview-update'
export const PREVIEW_SELECT = 'bitiko-preview-select'

export interface PreviewUpdateMessage {
  type: typeof PREVIEW_UPDATE
  sections: LayoutSection[]
  themeColor: string
  themeConfig: ThemeConfig
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

export function isPreviewUpdateMessage(data: unknown): data is PreviewUpdateMessage {
  return !!data && typeof data === 'object' && (data as { type?: unknown }).type === PREVIEW_UPDATE
}

export function isPreviewReadyMessage(data: unknown): data is PreviewReadyMessage {
  return !!data && typeof data === 'object' && (data as { type?: unknown }).type === PREVIEW_READY
}

export function isPreviewSelectMessage(data: unknown): data is PreviewSelectMessage {
  return !!data && typeof data === 'object' && (data as { type?: unknown }).type === PREVIEW_SELECT
}
