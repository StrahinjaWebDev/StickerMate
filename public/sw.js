const CACHE_NAME = "stickermate-v5";
const APP_SHELL = ["/icon.svg", "/manifest.webmanifest", "/opengraph-image"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request));
    return;
  }

  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (url.pathname.startsWith("/stickers/") || url.pathname === "/icon.svg" || url.pathname === "/manifest.webmanifest" || url.pathname === "/opengraph-image") {
    event.respondWith(cacheFirst(event.request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}
