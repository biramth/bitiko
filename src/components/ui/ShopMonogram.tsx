interface ShopMonogramProps {
  name: string
  size?: number
  className?: string
}

function shopInitial(name: string): string {
  const clean = name.trim()
  if (!clean) return 'B'
  const words = clean.split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return [...clean][0].toUpperCase()
}

export function ShopMonogram({ name, size = 32, className = '' }: ShopMonogramProps) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 select-none items-center justify-center bg-[var(--shop-button,#d9612e)] font-heading font-bold text-[var(--shop-button-text,#ffffff)] ${className}`}
      style={{ width: size, height: size, borderRadius: 'var(--shop-radius, 0.75rem)', fontSize: size * 0.45 }}
    >
      {shopInitial(name)}
    </span>
  )
}
