import { Scissors } from 'lucide-react'
import type { Service } from '@/features/services/useServices'
import { formatCurrency } from '@/utils/format'
import { FadeImage } from '@/components/ui/FadeImage'

interface ServiceCardProps {
  service: Service
  currency: string
}

export function ServiceCard({ service, currency }: ServiceCardProps) {
  return (
    <article className="group bg-[var(--shop-surface)] rounded-2xl border border-[var(--shop-border)] overflow-hidden transition-shadow hover:shadow-xl">
      {service.images?.[0] && (
        <div className="aspect-square relative overflow-hidden">
          <FadeImage
            src={service.images[0]}
            alt={service.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        </div>
      )}
      <div className="min-w-0 p-4">
        <h3 className="break-words font-semibold text-[var(--shop-text)]">{service.name}</h3>
        {service.description && <p className="mt-1 line-clamp-2 break-words text-sm text-[var(--shop-text)]/60">{service.description}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--shop-text)]/60">
          <span className="flex shrink-0 items-center gap-1">
            <Scissors size={12} />
            {service.duration} min
          </span>
          {service.categoryName && (
            <span className="max-w-full truncate rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium text-brand-700">
              {service.categoryName}
            </span>
          )}
        </div>
        <p className="mt-3 font-bold text-brand-600">
          {formatCurrency(service.price, currency)}
        </p>
      </div>
    </article>
  )
}

