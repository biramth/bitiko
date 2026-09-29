import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { disablePush, enablePush, getPushState, type PushState } from '@/lib/webPush'

// État partagé entre le bandeau de l'admin et la page Notifications : activer
// d'un côté met l'autre à jour sans rechargement.
let current: PushState | null = null
let loading: Promise<void> | null = null
const listeners = new Set<() => void>()

function publish(next: PushState) {
  current = next
  listeners.forEach((listener) => listener())
}

function load() {
  loading ??= getPushState()
    .then(publish)
    .catch(() => publish('unsupported'))
  return loading
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePushNotifications() {
  const state = useSyncExternalStore(subscribe, () => current, () => null)

  useEffect(() => {
    void load()
  }, [])

  const enable = useCallback(async () => {
    const next = await enablePush()
    publish(next)
    return next
  }, [])

  const disable = useCallback(async () => {
    await disablePush()
    publish(await getPushState())
  }, [])

  return { state, enable, disable }
}
