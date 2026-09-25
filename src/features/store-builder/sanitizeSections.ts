import type { LayoutSection } from '@/types/builder'

/** Shape-guard for stored section lists (PHASE-07 engine hardening). Drops only
 *  structurally invalid entries (non-objects, missing/foreign `type` field is
 *  KEPT for forward-compat — the renderer skips unknown types itself so a
 *  section can outlive a template switch). Never touches `visible` (filtered
 *  upstream by useEffectiveShopConfig) and never persists anything: render-time
 *  safety only, so corrupt data can't crash a storefront. */
export function sanitizeSections(input: unknown): LayoutSection[] {
  if (!Array.isArray(input)) return []
  const out: LayoutSection[] = []
  for (const entry of input) {
    if (!entry || typeof entry !== 'object') continue
    const candidate = entry as { id?: unknown; type?: unknown; visible?: unknown; config?: unknown }
    if (typeof candidate.id !== 'string' || candidate.id.length === 0) continue
    if (typeof candidate.type !== 'string' || candidate.type.length === 0) continue
    out.push({
      ...(candidate as object),
      id: candidate.id,
      type: candidate.type,
      visible: candidate.visible !== false,
      config: (candidate.config !== null && typeof candidate.config === 'object' ? candidate.config : {}) as never,
    } as LayoutSection)
  }
  return out
}

/** Capability gate for one section. `caps = null` means "capabilities unknown"
 *  (fetch failure, preview without shop): fail OPEN, display the section. */
export function sectionVisibleForCapabilities(
  section: Pick<LayoutSection, 'capabilities'>,
  caps: Set<string> | null,
): boolean {
  const required = section.capabilities
  if (!required || required.length === 0) return true
  if (caps === null) return true
  return required.every((c) => caps.has(c))
}
