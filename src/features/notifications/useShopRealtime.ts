import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { useToast } from '@/components/ui/Toast'
import { playChime, unlockChime } from '@/lib/chime'
import { formatCurrency } from '@/utils/format'

const ORDER_KEYS = ['orders', 'orders-counts', 'dashboard-stats']
const APPOINTMENT_KEYS = ['appointments', 'booking-pending', 'dashboard-stats']
const RESERVATION_KEYS = ['reservations', 'booking-pending', 'dashboard-stats']

/**
 * Tableau de bord en temps réel : une commande, un rendez-vous ou une réservation
 * créés sur la vitrine rafraîchissent les listes et pastilles, avec un bandeau et
 * un carillon. Realtime n'émet que les lignes que la RLS laisse lire au compte.
 */
export function useShopRealtime(shop: { id: string; currency?: string | null } | null | undefined) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const shopId = shop?.id
  const currency = shop?.currency ?? 'XOF'

  useEffect(() => {
    window.addEventListener('pointerdown', unlockChime, { once: true })
    window.addEventListener('keydown', unlockChime, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlockChime)
      window.removeEventListener('keydown', unlockChime)
    }
  }, [])

  useEffect(() => {
    if (!shopId) return
    const refresh = (keys: string[]) => keys.forEach((key) => void queryClient.invalidateQueries({ queryKey: [key] }))
    const filter = `shop_id=eq.${shopId}`
    const channel = supabase
      .channel(`shop-live:${shopId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter }, (payload) => {
        refresh(ORDER_KEYS)
        const order = payload.new as { order_number?: string; total?: number; customer_name?: string }
        toast.info(
          `Nouvelle commande ${order.order_number ?? ''}${order.total !== undefined ? ` — ${formatCurrency(Number(order.total), currency)}` : ''}${order.customer_name ? ` (${order.customer_name})` : ''}`,
        )
        playChime()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter }, (payload) => {
        refresh(ORDER_KEYS)
        const id = (payload.new as { id?: string }).id
        if (id) void queryClient.invalidateQueries({ queryKey: ['order', id] })
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'appointments', filter }, (payload) => {
        refresh(APPOINTMENT_KEYS)
        const name = (payload.new as { customer_name?: string }).customer_name
        toast.info(`Nouvelle demande de rendez-vous${name ? ` — ${name}` : ''}`)
        playChime()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reservations', filter }, (payload) => {
        refresh(RESERVATION_KEYS)
        const name = (payload.new as { customer_name?: string }).customer_name
        toast.info(`Nouvelle réservation de table${name ? ` — ${name}` : ''}`)
        playChime()
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [shopId, currency, queryClient, toast])
}
