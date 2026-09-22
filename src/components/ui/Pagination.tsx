import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getPaginationItems } from '@/utils/pagination'

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (p: number) => void
}) {
  if (totalPages <= 1) return null
  const items = getPaginationItems(page, totalPages)
  const baseBtn =
    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium sm:h-9 sm:w-9'
  return (
    <nav className="mt-6 flex flex-wrap items-center justify-center gap-1.5" aria-label="Pagination">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Page précédente"
        className={`${baseBtn} text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <ChevronLeft size={16} aria-hidden />
      </button>
      {items.map((item, index) =>
        item === 'ellipsis' ? (
          <span
            key={`ellipsis-${index}`}
            className="flex h-8 w-8 items-center justify-center text-sm text-gray-400 sm:h-9 sm:w-9"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-current={item === page ? 'page' : undefined}
            className={`${baseBtn} ${
              item === page ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {item}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Page suivante"
        className={`${baseBtn} text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <ChevronRight size={16} aria-hidden />
      </button>
    </nav>
  )
}
