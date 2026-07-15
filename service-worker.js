// service-worker.js

const CACHE = "chrono-v2";

const FILES = [
  "./",
  "./index.html",
  "./js/script.js",
  "./js/session.js",
  "./js/database.js",
  "./js/history.js",
  "./js/loaders/modelLoader.js",
  "./js/loaders/audioLoader.js",
  "./css/style.css",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./models/chronometre-01.glb",
  "./sounds/chrono.mp3",
  "./textures/environment/studio_small_08_2k.hdr",
];

// Installation
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
  self.skipWaiting();
});

// Activation
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

// Stratégie : Network First
self.addEventListener("fetch", (event) => {
  // On ne gère que les requêtes GET
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // On met à jour le cache avec la nouvelle version
        const copy = response.clone();
        caches.open(CACHE).then((cache) => {
          cache.put(event.request, copy);
        });
        return response;
      })
      .catch(() => {
        // Si hors ligne, on utilise le cache
        return caches.match(event.request);
      }),
  );
});
