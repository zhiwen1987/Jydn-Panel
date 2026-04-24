const CACHE_RESET_VERSION = '20260425-cache-reset-2'

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    if (self.caches) {
      const keys = await caches.keys()
      await Promise.all(keys.map(key => caches.delete(key)))
    }

    const clients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    })

    await self.registration.unregister()

    await Promise.all(clients.map((client) => {
      if ('navigate' in client)
        return client.navigate(client.url)
      client.postMessage({ type: 'ANGE_CACHE_RESET', version: CACHE_RESET_VERSION })
      return Promise.resolve()
    }))
  })())
})

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
