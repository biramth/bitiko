import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Palette } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { STORE_VIBE_BY_KEY, type StoreVibeKey } from '@/config/ambiances'
import { applyVibeToShop, shopVibe } from './applyVibe'
import { VibePicker } from './VibePicker'
import type { Shop } from '@/types'

/**
 * Permanent ambiance chooser in Paramètres → Apparence. Unlike the form fields
 * around it, selecting an ambiance applies immediately (it rebuilds the whole
 * theme), so it's its own block with its own feedback rather than a saved field.
 */
export function AmbianceSection({ shop }: { shop: Shop }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const current = shopVibe(shop)

  const apply = useMutation({
    mutationFn: (vibe: StoreVibeKey) => applyVibeToShop(shop, vibe),
    onSuccess: (_updated, vibe) => {
      queryClient.invalidateQueries({ queryKey: ['my-shop'] })
      toast.success(`Ambiance « ${STORE_VIBE_BY_KEY[vibe].label} » appliquée.`)
    },
    onError: () => toast.error("Impossible d'appliquer l'ambiance. Réessaie dans un instant."),
  })

  return (
    <div>
      <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Palette size={15} className="text-gray-400" aria-hidden /> Ambiance
        {apply.isPending && <Loader2 size={13} className="animate-spin text-gray-400" aria-label="Application…" />}
      </span>
      <p className="mt-1 text-xs text-gray-500">
        L'ambiance adapte les couleurs, polices et arrondis de ta boutique. Elle s'applique tout de suite et ne
        modifie pas ta couleur de marque.
      </p>
      <div className="mt-2">
        <VibePicker value={current} onSelect={(vibe) => apply.mutate(vibe)} disabled={apply.isPending} />
      </div>
    </div>
  )
}
