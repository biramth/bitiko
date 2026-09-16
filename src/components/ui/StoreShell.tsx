import { Logo } from '@/components/ui/Logo'

/** First-paint stand-in while the shop's own data (name, theme, sections)
 * fetches. A neutral, on-brand scaffold — no spinner — that merges into the
 * real storefront the moment the shop query resolves. */
export function StoreShell() {
  return (
    <div className="flex min-h-screen flex-col bg-sand-50">
      <header className="flex h-16 items-center gap-3 border-b border-ink-900/10 px-4 sm:px-6">
        <Logo size={28} withWordmark={false} />
        <span className="h-4 w-24 animate-pulse rounded bg-ink-900/10" />
      </header>
      <div className="flex-1 space-y-8 px-4 py-10 sm:px-6">
        <div className="space-y-3">
          <div className="h-6 w-1/2 max-w-[260px] animate-pulse rounded bg-ink-900/10" />
          <div className="h-4 w-2/3 max-w-[340px] animate-pulse rounded bg-ink-900/[0.07]" />
        </div>
        <div className="h-44 w-full animate-pulse rounded-2xl bg-sand-200/70" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-sand-200/70" />
          ))}
        </div>
      </div>
    </div>
  )
}