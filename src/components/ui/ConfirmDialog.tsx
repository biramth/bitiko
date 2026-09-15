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
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
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
            disabled={pending}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {pending && <TriangleAlert size={15} className="animate-pulse" aria-hidden />}
            {pending ? pendingLabel ?? `${confirmLabel}…` : confirmLabel}
          </button>
        </div>
      }
    >
      <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5">
        <TriangleAlert size={16} className="mt-0.5 shrink-0 text-red-600" aria-hidden />
        <p className="text-sm text-red-700">Cette action est irréversible.</p>
      </div>
    </Dialog>
  )
}