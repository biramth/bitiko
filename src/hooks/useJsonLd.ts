import { useEffect } from 'react'
import { serializeJsonLd } from '@/seo/jsonLd'

/** Injecte un bloc JSON-LD dans <head> le temps de vie de la page (identifié par `id`, jamais dupliqué). */
export function useJsonLd(id: string, data: unknown | null) {
  const serialized = data === null ? null : serializeJsonLd(data)
  useEffect(() => {
    if (serialized === null) return
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = id
    script.textContent = serialized
    document.getElementById(id)?.remove()
    document.head.appendChild(script)
    return () => {
      document.getElementById(id)?.remove()
    }
  }, [id, serialized])
}
