/** Checklist référencement d'une page personnalisée : trois signaux simples
 *  (titre, description, image de partage), partagés entre l'éditeur et les
 *  tests. Seuils volontairement modestes : guider, pas sanctionner. */

export interface PageSeoInput {
  title: string
  seoTitle: string | null
  seoDescription: string | null
  ogImage: string | null
}

export interface PageSeoCheck {
  key: 'title' | 'description' | 'image'
  label: string
  ok: boolean
  hint: string
}

/** Longueur cible d'un titre affiché dans Google (≈ 60 caractères). */
export const SEO_TITLE_TARGET = 60
/** Longueur cible d'une méta-description (≈ 155 caractères). */
export const SEO_DESCRIPTION_TARGET = 155

export function scorePageSeo(input: PageSeoInput): { checks: PageSeoCheck[]; done: number } {
  const title = (input.seoTitle?.trim() || input.title.trim())
  const description = (input.seoDescription?.trim() ?? '')
  const checks: PageSeoCheck[] = [
    {
      key: 'title',
      label: 'Titre',
      ok: title.length >= 10,
      hint: title.length >= 10 ? `${title.length} caractères` : 'Ajoutez un titre d’au moins 10 caractères',
    },
    {
      key: 'description',
      label: 'Description',
      ok: description.length >= 30,
      hint: description.length >= 30 ? `${description.length} caractères` : 'Résumez la page en une phrase',
    },
    {
      key: 'image',
      label: 'Image de partage',
      ok: !!input.ogImage,
      hint: input.ogImage ? 'Visible sur WhatsApp et Facebook' : 'Ajoutez une photo pour les partages',
    },
  ]
  return { checks, done: checks.filter((c) => c.ok).length }
}
