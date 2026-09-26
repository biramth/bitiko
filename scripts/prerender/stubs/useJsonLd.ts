export function useJsonLd(id: string, data: unknown) {
  const globals = globalThis as { __jsonld?: Record<string, unknown> }
  globals.__jsonld = globals.__jsonld ?? {}
  globals.__jsonld[id] = data
}
