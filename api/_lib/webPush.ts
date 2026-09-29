import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'
import { CONTACT_EMAIL } from '../../src/config/contact.js'

/**
 * Notifications push web (VAPID) vers les appareils du commerçant — gratuites,
 * sans fournisseur tiers. Clé publique partagée avec le navigateur
 * (VITE_VAPID_PUBLIC_KEY), clé privée serveur uniquement (VAPID_PRIVATE_KEY).
 */

export interface PushSubscriptionRow {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

export interface PushMessage {
  title: string
  body: string
  /** Chemin de l'admin ouvert au clic. */
  url: string
  /** Remplace une notification précédente de même tag au lieu de s'empiler. */
  tag?: string
}

const TITLE_MAX = 120
const BODY_MAX = 300

export function isWebPushConfigured(): boolean {
  return !!(process.env.VITE_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

/** Charge utile envoyée au service worker, bornée (limite ~4 Ko des services push). Pure. */
export function pushPayload(message: PushMessage): string {
  const clip = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1)}…` : value)
  return JSON.stringify({
    title: clip(message.title, TITLE_MAX),
    body: clip(message.body, BODY_MAX),
    url: message.url.startsWith('/') ? message.url : '/admin',
    tag: message.tag,
  })
}

/** Un endpoint qui répond 404/410 n'existe plus (désabonné, navigateur réinitialisé). Pure. */
export function isExpiredPushError(err: unknown): boolean {
  const status = (err as { statusCode?: number } | null)?.statusCode
  return status === 404 || status === 410
}

export async function sendWebPush(
  subscriptions: PushSubscriptionRow[],
  message: PushMessage,
): Promise<{ delivered: number; failed: number; expiredIds: string[] }> {
  const vapidDetails = {
    subject: process.env.VAPID_SUBJECT || `mailto:${CONTACT_EMAIL}`,
    publicKey: process.env.VITE_VAPID_PUBLIC_KEY ?? '',
    privateKey: process.env.VAPID_PRIVATE_KEY ?? '',
  }
  const payload = pushPayload(message)
  const results = await Promise.allSettled(
    subscriptions.map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
        vapidDetails,
        TTL: 6 * 3600,
        urgency: 'high',
      }),
    ),
  )
  const expiredIds: string[] = []
  let delivered = 0
  let failed = 0
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') delivered += 1
    else if (isExpiredPushError(result.reason)) expiredIds.push(subscriptions[index].id)
    else failed += 1
  })
  return { delivered, failed, expiredIds }
}

/** Envoie aux abonnements des comptes donnés et purge ceux qui n'existent plus. */
export async function sendWebPushToUsers(
  admin: SupabaseClient,
  userIds: string[],
  message: PushMessage,
): Promise<{ subscriptions: number; delivered: number; failed: number; expired: number }> {
  if (userIds.length === 0) return { subscriptions: 0, delivered: 0, failed: 0, expired: 0 }
  const { data, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', [...new Set(userIds)])
  if (error) throw error
  const subscriptions = (data ?? []) as PushSubscriptionRow[]
  if (subscriptions.length === 0) return { subscriptions: 0, delivered: 0, failed: 0, expired: 0 }
  const { delivered, failed, expiredIds } = await sendWebPush(subscriptions, message)
  if (expiredIds.length > 0) {
    const { error: purgeError } = await admin.from('push_subscriptions').delete().in('id', expiredIds)
    if (purgeError) console.error('push_subscriptions purge failed', purgeError)
  }
  return { subscriptions: subscriptions.length, delivered, failed, expired: expiredIds.length }
}
