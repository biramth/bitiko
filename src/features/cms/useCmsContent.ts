import { useQuery, type QueryClient } from '@tanstack/react-query'
import { faqsCollection, promosCollection, socialPostsCollection, testimonialsCollection } from '@/services/cms.service'

const STALE = 5 * 60 * 1000

/** Listes CMS d'une boutique pour le backoffice (tout, y compris inactif). */
export function useShopPromos(shopId: string | undefined) {
  return useQuery({
    queryKey: ['cms', 'promos', shopId],
    queryFn: () => promosCollection.list(shopId!),
    enabled: !!shopId,
    staleTime: STALE,
  })
}

export function useShopTestimonials(shopId: string | undefined) {
  return useQuery({
    queryKey: ['cms', 'testimonials', shopId],
    queryFn: () => testimonialsCollection.list(shopId!),
    enabled: !!shopId,
    staleTime: STALE,
  })
}

export function useShopFaqs(shopId: string | undefined) {
  return useQuery({
    queryKey: ['cms', 'faqs', shopId],
    queryFn: () => faqsCollection.list(shopId!),
    enabled: !!shopId,
    staleTime: STALE,
  })
}

export function useShopSocialPosts(shopId: string | undefined) {
  return useQuery({
    queryKey: ['cms', 'social-posts', shopId],
    queryFn: () => socialPostsCollection.list(shopId!),
    enabled: !!shopId,
    staleTime: STALE,
  })
}

/** Listes publiques (actives) pour la vitrine — mêmes clés de tri, RLS côté base. */
export function useActiveShopPromos(shopId: string | undefined) {
  return useQuery({
    queryKey: ['cms', 'promos', 'active', shopId],
    queryFn: () => promosCollection.listActive(shopId!),
    enabled: !!shopId,
    staleTime: STALE,
  })
}

export function useActiveShopTestimonials(shopId: string | undefined) {
  return useQuery({
    queryKey: ['cms', 'testimonials', 'active', shopId],
    queryFn: () => testimonialsCollection.listActive(shopId!),
    enabled: !!shopId,
    staleTime: STALE,
  })
}

export function useActiveShopFaqs(shopId: string | undefined) {
  return useQuery({
    queryKey: ['cms', 'faqs', 'active', shopId],
    queryFn: () => faqsCollection.listActive(shopId!),
    enabled: !!shopId,
    staleTime: STALE,
  })
}

export function useActiveShopSocialPosts(shopId: string | undefined) {
  return useQuery({
    queryKey: ['cms', 'social-posts', 'active', shopId],
    queryFn: () => socialPostsCollection.listActive(shopId!),
    enabled: !!shopId,
    staleTime: STALE,
  })
}

export function invalidateCms(queryClient: QueryClient, shopId: string) {
  for (const collection of ['promos', 'testimonials', 'faqs', 'social-posts'] as const) {
    queryClient.invalidateQueries({ queryKey: ['cms', collection, shopId] })
    queryClient.invalidateQueries({ queryKey: ['cms', collection, 'active', shopId] })
  }
}
