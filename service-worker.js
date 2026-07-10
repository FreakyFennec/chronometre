const CACHE = "chrono";

const FILES = [
    "./",
    "./index.html",
    "./manifest.json",
    "./icon-192.png",
    "./icon-512.png",
    "./chronometre-01.glb"
];

// Installation
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE).then(cache => cache.addAll(FILES))
    );
    self.skipWaiting();
});

// Activation
self.addEventListener("activate", event => {
    event.waitUntil(clients.claim());
});

// Stratégie : Network First
self.addEventListener("fetch", event => {
    // On ne gère que les requêtes GET
    if (event.request.method !== "GET") return;

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // On met à jour le cache avec la nouvelle version
                const copy = response.clone();
                caches.open(CACHE).then(cache => {
                    cache.put(event.request, copy);
                });
                return response;
            })
            .catch(() => {
                // Si hors ligne, on utilise le cache
                return caches.match(event.request);
            })
    );
});