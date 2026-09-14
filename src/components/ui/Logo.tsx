interface LogoProps {
  /** Pixel size of the icon mark. */
  size?: number
  /** Show the "Bitiko" wordmark next to the mark. */
  withWordmark?: boolean
  className?: string
}

export function Logo({ size = 28, withWordmark = true, className = '' }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden={withWordmark}
        role={withWordmark ? undefined : 'img'}
        aria-label={withWordmark ? undefined : 'Bitiko'}
      >
        <rect width="40" height="40" rx="10" fill="#221f45" />
        <circle cx="28.5" cy="10.5" r="3" fill="#f2b705" />
        <path d="M20 9 L31 27 H9 Z" fill="#d9612e" />
        <rect x="13" y="25" width="14" height="5" rx="1.5" fill="#fdf3e7" />
      </svg>
      {withWordmark && (
        <span className="font-heading text-lg font-bold tracking-tight text-ink-900">Bitiko</span>
      )}
    </span>
  )
}
