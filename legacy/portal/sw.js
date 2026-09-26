const CACHE_NAME = 'velo-portal-cache-v1';
const ASSETS = [
  'index.html',
  'app.js',
  'styles.css',
  'icon.svg'
];

// Instalação do Service Worker e Pré-Cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker Portal] Pré-cacheando recursos essenciais');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Ativação e Limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker Portal] Removendo cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptação de requisições e Estratégia de Cache Inteligente
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // BYPASS: Se for uma chamada de API, não cachear e ir direto para a rede
  if (requestUrl.pathname.includes('/api/') || event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Para recursos estáticos: Estratégia Network-First com Fallback para Cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se a resposta for válida, clonar e colocar no cache
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Se falhar a rede (offline), retornar do cache local
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Se não estiver no cache, falhar graciosamente
          return new Response('Sem conexão com a rede e recurso não cacheado.', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});
