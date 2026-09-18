import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Upload } from 'lucide-react'
import { requestPlanUpgrade, uploadPaymentProof } from '@/services/billing.service'
import { PLANS } from '@/config/plans'
import type { PlanKey } from '@/types/billing'
import { formatCurrency } from '@/utils/format'
import { Dialog } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024

interface PaymentProofDialogProps {
  open: boolean
  onClose: () => void
  shopId: string
  plan: Exclude<PlanKey, 'free'>
  onSubmitted?: () => void
}

/** State lives in the inner component so it resets every time the dialog opens. */
export function PaymentProofDialog(props: PaymentProofDialogProps) {
  return props.open ? <PaymentProofDialogInner {...props} /> : null
}

function PaymentProofDialogInner({ open, onClose, shopId, plan, onSubmitted }: PaymentProofDialogProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [payerPhone, setPayerPhone] = useState('')
  const [transactionRef, setTransactionRef] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Choisissez la capture d\'écran du reçu.')
      const proofPath = await uploadPaymentProof(shopId, file)
      await requestPlanUpgrade(shopId, plan, {
        proofPath,
        payerPhone: payerPhone.trim() || undefined,
        transactionRef: transactionRef.trim() || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wave-payments', shopId] })
      toast.success('Preuve envoyée. Votre plan sera activé après vérification.')
      onSubmitted?.()
      onClose()
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Impossible d'envoyer la preuve. Réessayez."),
  })

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0]
    e.target.value = ''
    if (!picked) return
    if (!ACCEPTED.includes(picked.type)) {
      setError('Format non pris en charge. Utilisez une image JPG, PNG ou WebP.')
      return
    }
    if (picked.size > MAX_BYTES) {
      setError('Image trop lourde (5 Mo maximum).')
      return
    }
    setError(null)
    setFile(picked)
    setPreviewUrl(URL.createObjectURL(picked))
  }

  const amount = formatCurrency(PLANS[plan].priceXof, 'XOF')
  const inputClass = 'mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

  return (
    <Dialog open={open} onClose={onClose} title={`Preuve de paiement — ${PLANS[plan].label}`} size="md">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!file || mutation.isPending) return
          setError(null)
          mutation.mutate()
        }}
        className="space-y-4"
      >
        <p className="text-sm text-gray-600">
          Après avoir payé <strong className="text-gray-900">{amount}</strong> avec Wave, envoyez la capture d'écran du
          reçu. Nous vérifions et activons votre plan sous 24 h.
        </p>

        <div>
          <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-4 text-center text-sm text-gray-600 hover:border-brand-400">
            {file && previewUrl ? (
              <img src={previewUrl} alt="Aperçu du reçu" className="max-h-48 rounded-lg object-contain" />
            ) : (
              <Upload size={22} className="text-gray-400" aria-hidden />
            )}
            <span className="font-medium text-brand-700">{file ? 'Changer la capture' : 'Choisir la capture du reçu'}</span>
            <span className="text-xs text-gray-400">JPG, PNG ou WebP, 5 Mo maximum</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onFileChange} className="sr-only" />
          </label>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">
            Numéro Wave utilisé pour payer <span className="font-normal text-gray-400">(facultatif)</span>
            <input type="tel" inputMode="tel" value={payerPhone} onChange={(e) => setPayerPhone(e.target.value)} className={inputClass} />
          </label>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">
            Référence de transaction <span className="font-normal text-gray-400">(facultatif)</span>
            <input
              type="text"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="Ex. T_AB12CD34"
              className={inputClass}
            />
          </label>
          <p className="mt-1 text-xs text-gray-400">Indiquée sur le reçu Wave — accélère la vérification</p>
        </div>

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={!file || mutation.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {mutation.isPending && <Loader2 size={16} className="animate-spin" aria-hidden />}
          Envoyer ma preuve
        </button>
      </form>
    </Dialog>
  )
}
