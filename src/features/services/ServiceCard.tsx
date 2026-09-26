import { Scissors } from 'lucide-react'
import type { Service } from '@/features/services/useServices'
import { formatCurrency } from '@/utils/format'

interface ServiceCardProps {
  service: Service
  currency: string
}

export function ServiceCard({ service, currency }: ServiceCardProps) {
  return (
    <article className="group bg-[var(--shop-surface)] rounded-2xl border border-[var(--shop-border)] overflow-hidden transition-shadow hover:shadow-xl">
      {service.images?.[0] && (
        <div className="aspect-square relative overflow-hidden">
          <img
            src={service.images[0]}
            alt={service.name}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        </div>
      )}
      <div className="p-4">
        <h3 className="font-semibold text-[var(--shop-text)]">{service.name}</h3>
        {service.description && <p className="mt-1 text-sm text-[var(--shop-text)]/60 line-clamp-2">{service.description}</p>}
        <div className="mt-3 flex items-center gap-4 text-xs text-[var(--shop-text)]/60">
          <span className="flex items-center gap-1">
            <Scissors size={12} />
            {service.duration} min
          </span>
          {service.categoryName && (
            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-brand-100 text-brand-700">
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

