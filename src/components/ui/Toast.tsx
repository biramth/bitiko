import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'

type ToastVariant = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  variant: ToastVariant
  message: string
}

interface ToastApi {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const AUTO_DISMISS_MS: Record<ToastVariant, number> = {
  success: 3500,
  info: 4000,
  error: 6000,
}

const VARIANT_STYLES: Record<ToastVariant, { icon: ReactNode; ring: string; glyph: string }> = {
  success: {
    glyph: 'text-emerald-600',
    ring: 'border-emerald-200',
    icon: <CheckCircle2 size={18} className="text-emerald-600" aria-hidden />,
  },
  error: {
    glyph: 'text-red-600',
    ring: 'border-red-200',
    icon: <TriangleAlert size={18} className="text-red-600" aria-hidden />,
  },
  info: {
    glyph: 'text-ink-500',
    ring: 'border-gray-200',
    icon: <Info size={18} className="text-ink-500" aria-hidden />,
  },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (variant: ToastVariant, message: string) => {
      const id = Date.now() + Math.random()
      setToasts((current) => [...current.slice(-3), { id, variant, message }])
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS[variant])
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            aria-live="polite"
            className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
          >
            {toasts.map((toast) => {
              const style = VARIANT_STYLES[toast.variant]
              const isError = toast.variant === 'error'
              return (
                <div
                  key={toast.id}
                  role={isError ? 'alert' : 'status'}
                  className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-white px-3.5 py-3 shadow-lg shadow-ink-900/10 animate-toast-in ${style.ring}`}
                >
                  <span className="mt-px shrink-0">{style.icon}</span>
                  <p className={`min-w-0 flex-1 text-sm ${style.glyph}`}>{toast.message}</p>
                  <button
                    type="button"
                    aria-label="Fermer la notification"
                    onClick={() => dismiss(toast.id)}
                    className="shrink-0 rounded-md p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                  >
                    <X size={14} />
                  </button>
                </div>
              )
            })}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a <ToastProvider>')
  return ctx
}