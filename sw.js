// Offline-first shell. Navigations are always answered from the cached
// index.html and revalidated against the URL *without* its query string, so
// text shared into the app is handled on the device and is not sent to the
// host once this worker is in control.
const CACHE = "select-to-calendar-v1";
const SCOPE = self.registration.scope;
const abs = (p) => new URL(p, SCOPE).href;
const ASSETS = [
  "index.html",
  "chrono.bundle.js",
  "calendar-helper.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
].map(abs);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (!url.href.startsWith(SCOPE)) return;

  const key = req.mode === "navigate" ? abs("index.html") : url.origin + url.pathname;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(key);
      const refresh = fetch(key)
        .then((res) => {
          if (res && res.ok) cache.put(key, res.clone());
          return res;
        })
        .catch(() => null);
      if (hit) {
        event.waitUntil(refresh);
        return hit;
      }
      const res = await refresh;
      return res || new Response("Offline", { status: 503, statusText: "Offline" });
    })()
  );
});
