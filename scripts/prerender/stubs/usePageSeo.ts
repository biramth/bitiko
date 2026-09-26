// Stub SSR : au lieu de modifier <head>, la page déclare ses balises, capturées puis injectées dans le HTML statique.
export function usePageSeo(options: unknown) {
  ;(globalThis as { __seo?: unknown }).__seo = options
}

export function useShopFavicon() {}
