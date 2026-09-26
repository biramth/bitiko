import { useQuery } from '@tanstack/react-query'
import { listActiveTeamMembers } from '@/services/teamMember.service'

export interface TeamMember {
  id: string
  name: string
  role: string
  specialty?: string
  avatarUrl?: string
  phone?: string
  email?: string
  rating?: number
}

export function useTeamMembers(shopId: string | undefined) {
  return useQuery({
    queryKey: ['team-members', shopId],
    queryFn: async (): Promise<TeamMember[]> => {
      if (!shopId) return []
      const rows = await listActiveTeamMembers(shopId)
      return rows.map((r) => ({
        id: r.id ?? '',
        name: r.name ?? '',
        role: r.role ?? '',
        specialty: r.specialty ?? undefined,
        avatarUrl: r.avatar_url ?? undefined,
        phone: r.phone ?? undefined,
        email: r.email ?? undefined,
        rating: r.rating ?? undefined,
      }))
    },
    enabled: !!shopId,
    staleTime: 5 * 60 * 1000,
  })
}
