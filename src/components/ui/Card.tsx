export function Card({
  as: Tag = 'div',
  padded = true,
  className = '',
  children,
}: {
  as?: 'div' | 'section' | 'article'
  padded?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <Tag className={`rounded-xl border border-gray-200 bg-white shadow-sm ${padded ? 'p-4 sm:p-5' : ''} ${className}`}>
      {children}
    </Tag>
  )
}
