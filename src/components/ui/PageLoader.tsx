import { Logo } from '@/components/ui/Logo'

function SkeletonBar({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

export function PageLoader({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-3">
        <Logo size={40} withWordmark={false} className="animate-pulse" />
        <span className="font-heading text-lg font-bold tracking-tight text-ink-900">Bitiko</span>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <SkeletonBar className="h-28 rounded-2xl" />
        <SkeletonBar className="h-28 rounded-2xl" />
        <SkeletonBar className="h-28 rounded-2xl" />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <SkeletonBar className="h-8 w-52 rounded-lg" />
        <SkeletonBar className="h-10 w-32 rounded-lg" />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="space-y-4 p-5">
          <SkeletonBar className="h-4 w-full rounded" />
          <SkeletonBar className="h-4 w-5/6 rounded" />
          <SkeletonBar className="h-4 w-2/3 rounded" />
          <SkeletonBar className="h-4 w-3/4 rounded" />
        </div>
      </div>

      <span className="sr-only">{label}</span>
    </div>
  )
}