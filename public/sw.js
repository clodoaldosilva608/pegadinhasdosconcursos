// Service Worker do Pegadinhas dos Concursos (PWA instalável).
// Estratégias:
//  - /api/*            → sempre rede (nunca cacheia respostas dinâmicas de IA)
//  - navegação (HTML)  → rede primeiro; sem rede, shell "/" cacheado e,
//                        na falta deste, a tela /offline.html
//  - estáticos         → cache-first com preenchimento em runtime
//                        (/_next/static, /icons, /brand, manifest, ícones)
const VERSION = "pc-v1.0.0";
const PRECACHE = `${VERSION}-precache`;
const RUNTIME = `${VERSION}-runtime`;

const PRECACHE_URLS = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-maskable-192.png",
  "/brand/logo-pegadinhas.webp",
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
            .then((cached) => cached || caches.match("/offline.html"))
            .then((fallback) => fallback || Response.error())
        )
    );
    return;
  }

  // Estáticos imutáveis/instaláveis: cache-first
  const cacheable =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/offline.html" ||
    url.pathname === "/icon.png" ||
    url.pathname === "/apple-icon.png" ||
    url.pathname === "/apple-touch-icon.png";

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
