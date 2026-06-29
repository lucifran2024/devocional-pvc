const CACHE_NAME = 'pvc-v6';
const STATIC_ASSETS = [
    '/',
    '/login',
    '/biblioteca',
    '/plano-de-leitura',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    '/offline.html',
];

// Timeout para navegações: em conexão instável (lie-fi) o fetch pode
// pendurar por minutos — após esse limite, serve o cache.
const NAV_TIMEOUT_MS = 4000;

function fetchComTimeout(request, ms) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timeout')), ms);
        fetch(request).then(
            (res) => { clearTimeout(timer); resolve(res); },
            (err) => { clearTimeout(timer); reject(err); }
        );
    });
}

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

    // ESTRATEGIA 2: Navegações (HTML) → Network-first com timeout + fallback robusto
    // CRÍTICO: as abas do app usam query strings (/biblioteca?salvos=1) — o match
    // precisa ignorar a query, senão o cache de /biblioteca nunca é encontrado e
    // o app não abre offline mesmo com tudo baixado.
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetchComTimeout(event.request, NAV_TIMEOUT_MS)
                .then((response) => {
                    if (response.ok) {
                        // Clones criados ANTES de retornar (depois o body já foi consumido)
                        const cloneExato = response.clone();
                        const cloneSemQuery = url.search ? response.clone() : null;
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, cloneExato);
                            // Guarda também sem query para servir qualquer variante offline
                            if (cloneSemQuery) cache.put(url.pathname, cloneSemQuery);
                        });
                    }
                    return response;
                })
                .catch(async () => {
                    // 1. Cache exato → 2. ignorando query → 3. home → 4. offline.html
                    const exato = await caches.match(event.request);
                    if (exato) return exato;
                    const semQuery = await caches.match(event.request, { ignoreSearch: true });
                    if (semQuery) return semQuery;
                    const porPathname = await caches.match(url.pathname);
                    if (porPathname) return porPathname;
                    const home = await caches.match('/');
                    if (home) return home;
                    return caches.match('/offline.html');
                })
        );
        return;
    }

    // ESTRATEGIA 3: Outros assets → Network-first, cache fallback
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
                // Fallback to cache (ignora query: cobre variações de URL)
                return caches.match(event.request, { ignoreSearch: true }).then((cached) => {
                    if (cached) return cached;
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
