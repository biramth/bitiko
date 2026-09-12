export function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
        Rupture de stock
      </span>
    )
  }

  if (stock <= 5) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
        Plus que {stock} en stock
      </span>
    )
  }

  return (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
      En stock
    </span>
  )
}
