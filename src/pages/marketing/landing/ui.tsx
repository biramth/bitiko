import { useEffect, useRef, useState } from 'react'

/** Fades + slides an element up once it scrolls into view — applied across
 * every section so the page feels alive while scrolling, not just on load. */
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'} motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      {children}
    </div>
  )
}

export function SectionEyebrow({ children, light }: { children: string; light?: boolean }) {
  return (
    <p className={`mb-4 text-center font-mono text-sm font-semibold uppercase tracking-[0.2em] ${light ? 'text-gold-400' : 'text-brand-600'}`}>
      {children}
    </p>
  )
}

/** Titre de section standard : eyebrow + titre + sous-titre optionnel. */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  light,
  className = 'mb-14',
}: {
  eyebrow: string
  title: React.ReactNode
  subtitle?: string
  light?: boolean
  className?: string
}) {
  return (
    <Reveal className={`text-center ${className}`}>
      <SectionEyebrow light={light}>{eyebrow}</SectionEyebrow>
      <h2 className={`mx-auto max-w-[760px] font-heading text-3xl font-semibold sm:text-4xl lg:text-5xl ${light ? 'text-white' : 'text-ink-900'}`}>
        {title}
      </h2>
      {subtitle && <p className={`mx-auto mt-4 max-w-[620px] ${light ? 'text-ink-100/70' : 'text-ink-700/75'}`}>{subtitle}</p>}
    </Reveal>
  )
}

/* ── Captures réelles de l'interface (données fictives) — `npm run marketing:shots` ── */

export function PhoneShot({
  name,
  alt,
  className = '',
  eager = false,
}: {
  name: string
  alt: string
  className?: string
  eager?: boolean
}) {
  return (
    <div className={`overflow-hidden rounded-[2rem] border-[3px] border-ink-800 bg-white shadow-2xl shadow-brand-900/15 ${className}`}>
      <img
        src={`/marketing/${name}.webp`}
        alt={alt}
        width={390}
        height={844}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className="block h-auto w-full"
      />
    </div>
  )
}

export function BrowserShot({
  name,
  alt,
  width = 1440,
  height = 1080,
  className = '',
  eager = false,
}: {
  name: string
  alt: string
  width?: number
  height?: number
  className?: string
  eager?: boolean
}) {
  return (
    <div className={`overflow-hidden rounded-xl border border-sand-200 bg-white shadow-xl shadow-brand-900/10 ${className}`}>
      <div className="flex items-center gap-1.5 border-b border-sand-200 bg-sand-100 px-3.5 py-2.5" aria-hidden="true">
        <span className="h-2.5 w-2.5 rounded-full bg-sand-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-sand-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-sand-300" />
      </div>
      <img
        src={`/marketing/${name}.webp`}
        alt={alt}
        width={width}
        height={height}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className="block h-auto w-full"
      />
    </div>
  )
}
