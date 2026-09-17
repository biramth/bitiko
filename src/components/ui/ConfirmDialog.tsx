import { TriangleAlert } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  pendingLabel?: string
  pending?: boolean
  /** 'danger' (default) is for irreversible/destructive actions (red button, warning banner). 'default' is a neutral yes/no confirmation. */
  tone?: 'danger' | 'default'
  /** Disables the confirm button while true (in addition to `pending`) — e.g. a typed-confirmation gate not yet satisfied. */
  confirmDisabled?: boolean
  children?: React.ReactNode
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  pendingLabel,
  pending = false,
  tone = 'danger',
  confirmDisabled = false,
  children,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const isDanger = tone === 'danger'
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending || confirmDisabled}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60 ${
              isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700'
            }`}
          >
            {pending && <TriangleAlert size={15} className="animate-pulse" aria-hidden />}
            {pending ? pendingLabel ?? `${confirmLabel}…` : confirmLabel}
          </button>
        </div>
      }
    >
      {isDanger && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5">
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-red-600" aria-hidden />
          <p className="text-sm text-red-700">Cette action est irréversible.</p>
        </div>
      )}
      {children && <div className="mt-3">{children}</div>}
    </Dialog>
  )
}