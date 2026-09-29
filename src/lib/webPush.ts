import { supabase } from '@/lib/supabaseClient'

/** État des notifications push sur cet appareil, du point de vue du commerçant. */
export type PushState = 'unsupported' | 'needs-install' | 'unconfigured' | 'denied' | 'off' | 'on'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
const SW_URL = '/sw.js'

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
}

/** Clé VAPID base64url → octets attendus par PushManager.subscribe. Pure. */
export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`.replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i)
  return bytes
}

function hasPushApis(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration('/')
  return (await registration?.pushManager.getSubscription()) ?? null
}

async function saveSubscription(subscription: PushSubscription): Promise<void> {
  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error('Abonnement push incomplet.')
  const { error } = await supabase.rpc('register_push_subscription', {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys.p256dh,
    p_auth: json.keys.auth,
    p_user_agent: navigator.userAgent,
  })
  if (error) throw error
}

export async function getPushState(): Promise<PushState> {
  // Sur iPhone, le push web n'existe que pour l'app ajoutée à l'écran d'accueil.
  if (typeof window !== 'undefined' && isIos() && !isStandalone()) return 'needs-install'
  if (!hasPushApis()) return 'unsupported'
  if (!VAPID_PUBLIC_KEY) return 'unconfigured'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission !== 'granted') return 'off'
  return (await currentSubscription()) ? 'on' : 'off'
}

/** Demande l'autorisation (à appeler depuis un clic) puis abonne cet appareil. */
export async function enablePush(): Promise<PushState> {
  if (!hasPushApis() || !VAPID_PUBLIC_KEY) return 'unsupported'
  const permission = await Notification.requestPermission()
  if (permission === 'denied') return 'denied'
  if (permission !== 'granted') return 'off'
  const registration = await navigator.serviceWorker.register(SW_URL)
  await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) }))
  await saveSubscription(subscription)
  return 'on'
}

/** Désabonne cet appareil (et l'oublie côté serveur). Sans effet s'il n'était pas abonné. */
export async function disablePush(): Promise<void> {
  if (!hasPushApis()) return
  const subscription = await currentSubscription()
  if (!subscription) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
  await subscription.unsubscribe()
}

/** À chaque ouverture de l'admin : rattache l'abonnement existant au compte connecté. */
export async function refreshPushSubscription(): Promise<void> {
  if (!hasPushApis() || !VAPID_PUBLIC_KEY || Notification.permission !== 'granted') return
  const subscription = await currentSubscription()
  if (subscription) await saveSubscription(subscription)
}

export async function sendTestPush(): Promise<void> {
  const { data } = await supabase.auth.getSession()
  const response = await fetch('/api/push-test', {
    method: 'POST',
    headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}` },
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'Envoi impossible.')
  }
}
