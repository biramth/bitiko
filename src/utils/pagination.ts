export type PaginationItem = number | 'ellipsis'

/** Numéros de pages à afficher : toujours le premier et le dernier, une
 *  fenêtre de ±2 autour de la page courante, et des ellipses pour les trous. */
export function getPaginationItems(page: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 1) return []
  const pages = new Set<number>([1, totalPages])
  for (let i = page - 2; i <= page + 2; i++) {
    if (i >= 1 && i <= totalPages) pages.add(i)
  }
  const sorted = [...pages].sort((a, b) => a - b)
  const items: PaginationItem[] = []
  let prev = 0
  for (const p of sorted) {
    if (p - prev === 2) items.push(prev + 1)
    else if (p - prev > 2) items.push('ellipsis')
    items.push(p)
    prev = p
  }
  return items
}
