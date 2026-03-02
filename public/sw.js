const CACHE_NAME = 'pvc-v2';
const STATIC_ASSETS = [
    '/',
    '/biblioteca',
    '/plano-de-leitura',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    '/offline.html',
];

// Install: Cache static assets + offline fallback
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch: Estrategia por tipo de recurso
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Skip external requests
    if (url.origin !== location.origin) return;

    // Skip API routes (nunca cachear)
    if (url.pathname.startsWith('/api/')) return;

    // ESTRATEGIA 1: Bundles Next.js (/_next/static/*) → Cache-first
    // Esses arquivos tem hash no nome e sao imutaveis
    if (url.pathname.startsWith('/_next/static/')) {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                if (cached) return cached;
                return fetch(event.request).then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, clone);
                        });
                    }
                    return response;
                });
            })
        );
        return;
    }

    // ESTRATEGIA 2: Paginas e outros assets → Network-first, cache fallback, offline fallback
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clone and cache successful responses
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Fallback to cache
                return caches.match(event.request).then((cached) => {
                    if (cached) return cached;

                    // Se e uma navegacao (pagina HTML) e nao tem cache, mostrar offline.html
                    if (event.request.mode === 'navigate') {
                        return caches.match('/offline.html');
                    }

                    // Para outros recursos sem cache, retornar erro
                    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
                });
            })
    );
});

// Push Notification handler
self.addEventListener('push', (event) => {
    const data = event.data?.json() || {};
    const title = data.title || 'Devocional PVC';
    const options = {
        body: data.body || 'Sua mensagem diária está pronta!',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'devotional',
        renotify: true,
        data: data.url || '/',
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data || '/')
    );
});
