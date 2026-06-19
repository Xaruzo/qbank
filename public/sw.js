const CACHE_VERSION = "qbank-sw-v1";
const APP_SHELL_CACHE = `${CACHE_VERSION}:app-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}:runtime`;

const APP_SHELL_URLS = ["/", "/index.html", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k.startsWith("qbank-sw-") && !k.startsWith(CACHE_VERSION) ? caches.delete(k) : undefined)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isNavigate = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");

  if (isNavigate) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(APP_SHELL_CACHE).then((c) => c.put("/index.html", copy));
          return res;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
        return res;
      });
    })
  );
});

