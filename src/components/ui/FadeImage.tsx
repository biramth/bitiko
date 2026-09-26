import { useCallback, type ImgHTMLAttributes } from 'react'

interface FadeImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Image au-dessus de la ligne de flottaison (LCP) : chargée tout de suite, jamais différée. */
  priority?: boolean
}

/**
 * <img> qui n'apparaît qu'une fois entièrement chargée ET décodée, avec un fondu court : plus d'image qui se
 * dessine ligne par ligne ni de « pop » brutal. L'état est porté par un attribut du DOM (`data-loaded`) et la
 * règle CSS `img[data-fade]` de index.css : aucun rendu React supplémentaire par image. Une image déjà en cache
 * s'affiche immédiatement, sans clignotement. Un changement de `src` remonte l'élément (nouveau fondu).
 */
export function FadeImage({ priority = false, loading, decoding = 'async', onLoad, onError, ...props }: FadeImageProps) {
  const show = (img: HTMLImageElement) => img.setAttribute('data-loaded', '')

  const ref = useCallback((img: HTMLImageElement | null) => {
    // Déjà en cache (ou rendu serveur hydraté) : visible avant le premier affichage.
    if (img && img.complete && img.naturalWidth > 0) img.setAttribute('data-loaded', '')
  }, [])

  return (
    <img
      key={props.src}
      ref={ref}
      data-fade=""
      loading={priority ? 'eager' : loading}
      decoding={decoding}
      fetchPriority={priority ? 'high' : props.fetchPriority}
      onLoad={(event) => {
        const img = event.currentTarget
        // decode() garantit qu'aucun pixel à moitié peint n'est montré ; en cas d'échec on affiche quand même.
        if (typeof img.decode === 'function') img.decode().then(() => show(img), () => show(img))
        else show(img)
        onLoad?.(event)
      }}
      onError={(event) => {
        show(event.currentTarget)
        onError?.(event)
      }}
      {...props}
    />
  )
}
