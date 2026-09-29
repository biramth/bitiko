// Service worker Bitiko : notifications push du tableau de bord commerçant
// uniquement (aucun cache, aucune interception réseau).

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'Bitiko'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Tableau de bord ouvert et visible : l'alerte en temps réel (son + bandeau) suffit.
      const visibleAdmin = clients.some(
        (client) => client.visibilityState === 'visible' && new URL(client.url).pathname.startsWith('/admin'),
      )
      if (visibleAdmin && data.tag !== 'bitiko-push-test') return undefined
      return self.registration.showNotification(title, {
        body: data.body || '',
        icon: '/icon-192.png',
        badge: '/favicon-96.png',
        tag: data.tag,
        renotify: !!data.tag,
        data: { url: data.url || '/admin' },
      })
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/admin', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const admin = clients.find((client) => new URL(client.url).pathname.startsWith('/admin'))
      if (!admin) return self.clients.openWindow(target)
      return admin.focus().then((client) => client.navigate(target).catch(() => client))
    }),
  )
})
