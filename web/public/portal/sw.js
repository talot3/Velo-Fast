// Substitui o service worker do portal da v1 (velo-portal-cache-v1), que
// guardava cópias de páginas e respostas no aparelho. O portal v2 não usa
// service worker: este apaga o cache antigo e se desinstala sozinho.
self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("velo-portal-cache")).map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
  )
})
