/* Sekolahku PWA service worker — network-first (timeout 4s saat lelet), fallback ke cache saat offline. */
const CACHE = "sekolahku-v2";
const MODELS = "sekolahku-models-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== MODELS).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms));

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.pathname.includes("/api/") || url.pathname.includes("hot-update") || url.pathname.includes("sockjs") ||
      url.pathname.includes("__webpack") || url.pathname.startsWith("/ws")) return;

  // Model wajah besar & tidak berubah → cache-first
  if (url.pathname.startsWith("/models/")) {
    event.respondWith(caches.open(MODELS).then(async (c) => (await c.match(req)) || fetch(req).then((res) => { c.put(req, res.clone()); return res; })));
    return;
  }

  const network = fetch(req).then((res) => {
    if (res.ok && (url.origin === self.location.origin || url.hostname.includes("fonts"))) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
    }
    return res;
  });
  event.respondWith(
    Promise.race([network, timeout(req.mode === "navigate" ? 4000 : 8000)])
      .catch(async () => (await caches.match(req)) || (req.mode === "navigate" ? caches.match("/") : network))
  );
});
