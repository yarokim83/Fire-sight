const CACHE_NAME = 'firesight-v3-offline-ready';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/vite.svg'
];

self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force activate new SW
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', (event) => {
    // [NEW] Ignore non-http requests (e.g. chrome-extension://)
    if (!event.request.url.startsWith('http')) return;

    // Navigation requests (HTML) -> Network First
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, response.clone());
                        return response;
                    });
                })
                .catch(() => {
                    return caches.match('/index.html') || caches.match(event.request);
                })
        );
        return;
    }

    // Asset requests -> Stale-While-Revalidate (Cache First, Background Update)
    // Or Cache First, Fallback to Network and Cache
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) return response; // Return hit

                // Clone request stream
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then((response) => {
                    // Check if valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Cache the new response
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                    return response;
                });
            })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim(); // Take control immediately
});
