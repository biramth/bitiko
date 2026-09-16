import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  titleClassName?: string
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'sm',
  titleClassName,
}: DialogProps) {
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  const panelSize =
    size === 'sm' ? 'max-w-sm' : size === 'md' ? 'max-w-lg' : 'max-h-[85vh] max-w-2xl overflow-y-auto'

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Fermer la fenêtre"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink-900/50 backdrop-blur-sm"
      />
      <div className={`relative w-full ${panelSize} rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl`}>
        <button
          type="button"
          aria-label="Fermer"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <X size={16} />
        </button>
        <h2 className={`font-heading text-lg font-bold text-gray-900 ${titleClassName ?? ''}`}>{title}</h2>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
        {children && <div className="mt-4">{children}</div>}
        {footer && <div className="mt-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}