import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Sparkles } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'
import { STORE_VIBE_BY_KEY, type StoreVibeKey } from '@/config/ambiances'
import { applyVibeToShop, shopVibe } from './applyVibe'
import { VibePicker } from './VibePicker'
import type { Shop } from '@/types'

const dismissKey = (shopId: string) => `bitiko:ambiance-prompt:${shopId}`

function readDismissed(shopId: string): boolean {
  try {
    return window.localStorage.getItem(dismissKey(shopId)) === '1'
  } catch {
    return false
  }
}

function writeDismissed(shopId: string): void {
  try {
    window.localStorage.setItem(dismissKey(shopId), '1')
  } catch {
    // localStorage unavailable — the dialog just reappears next visit.
  }
}

/**
 * One-off prompt shown to shops created before the ambiance feature existed
 * (vibe is null). Picking an ambiance applies it immediately; "Plus tard" hides
 * the prompt for good — the chooser stays available under Paramètres → Apparence.
 */
export function AmbianceMigrationDialog({ shop }: { shop: Shop }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [selected, setSelected] = useState<StoreVibeKey | null>(null)
  const [dismissed, setDismissed] = useState(() => readDismissed(shop.id))

  const apply = useMutation({
    mutationFn: (vibe: StoreVibeKey) => applyVibeToShop(shop, vibe),
    onSuccess: (_updated, vibe) => {
      queryClient.invalidateQueries({ queryKey: ['my-shop'] })
      toast.success(`Ambiance « ${STORE_VIBE_BY_KEY[vibe].label} » appliquée.`)
      setDismissed(true)
    },
    onError: () => toast.error("Impossible d'appliquer l'ambiance. Réessaie dans un instant."),
  })

  const dismiss = () => {
    writeDismissed(shop.id)
    setDismissed(true)
  }

  const open = !shopVibe(shop) && !dismissed

  return (
    <Dialog
      open={open}
      onClose={dismiss}
      size="lg"
      title="Choisis l'ambiance de ta boutique"
      description="Une nouvelle option pour donner un style à ta vitrine : couleurs, police et arrondis en un clic. Tu pourras en changer à tout moment."
      titleClassName="flex items-center gap-2"
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
          >
            Plus tard
          </button>
          <button
            type="button"
            disabled={!selected || apply.isPending}
            onClick={() => selected && apply.mutate(selected)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {apply.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Appliquer
          </button>
        </div>
      }
    >
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
        <Sparkles size={13} className="text-gold-500" aria-hidden /> Aperçu de chaque ambiance
      </p>
      <VibePicker value={selected} onSelect={setSelected} disabled={apply.isPending} />
    </Dialog>
  )
}
