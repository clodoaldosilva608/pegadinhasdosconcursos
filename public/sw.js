// Service Worker do Detector de Pegadinhas (PWA instalável).
// Estratégias:
//  - /api/*            → sempre rede (nunca cacheia respostas dinâmicas de IA)
//  - navegação (HTML)  → rede primeiro; sem rede, cai para o shell "/" cacheado
//  - estáticos         → cache-first com preenchimento em runtime
//                           (/_next/static, /icons, manifest, imagens otimizadas)
const VERSION = "dp-pwa-v1";
const PRECACHE = `${VERSION}-precache`;
const RUNTIME = `${VERSION}-runtime`;

const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-maskable-192.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== PRECACHE && k !== RUNTIME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Chamadas de IA/conta: sempre rede — nada de cache
  if (url.pathname.startsWith("/api/")) return;

  // Navegação: rede primeiro, shell offline como reserva
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches
            .open(RUNTIME)
            .then((cache) => cache.put("/", copy))
            .catch(() => {});
          return response;
        })
        .catch(() =>
          caches
            .match("/")
            .then((cached) => cached || Response.error())
        )
    );
    return;
  }

  // Estáticos imutáveis/instaláveis: cache-first
  const cacheable =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/icon.png" ||
    url.pathname === "/apple-icon.png";

  if (cacheable) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches
              .open(RUNTIME)
              .then((cache) => cache.put(request, copy))
              .catch(() => {});
          }
          return response;
        });
      })
    );
  }
});
