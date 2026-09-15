export function StockBadge({
  stock,
  lowStockThreshold = 5,
  compact = false,
}: {
  stock: number
  lowStockThreshold?: number
  /** In compact mode, healthy stock renders nothing — only scarcity/unavailability is worth flagging. */
  compact?: boolean
}) {
  if (stock <= 0) {
    return <span className="text-xs font-medium tracking-wide text-red-600">Rupture de stock</span>
  }

  if (stock <= lowStockThreshold) {
    return <span className="text-xs font-medium tracking-wide text-amber-600">Plus que {stock} en stock</span>
  }

  if (compact) return null

  return <span className="text-xs font-medium tracking-wide text-emerald-600">En stock</span>
}
