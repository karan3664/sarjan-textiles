/* Sarjan Textiles storefront service worker — Sprint 7 */

const SW_VERSION = "sarjan-storefront-20260612-nav-fix";
const STATIC_CACHE = `sarjan-static-${SW_VERSION}`;
const RUNTIME_CACHE = `sarjan-runtime-${SW_VERSION}`;
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/favicon.ico",
  "/sarjan-assets/sarjan-logo.svg",
];

const STATIC_PREFIXES = [
  "/_next/static/",
  "/sarjan-assets/",
  "/template/",
  "/downloads/mobile-release.json",
];

const STATIC_EXTENSIONS = [
  ".css",
  ".js",
  ".woff",
  ".woff2",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".avif",
  ".svg",
  ".ico",
  ".gif",
];

function isSkippableRequest(request, url) {
  if (request.method !== "GET") return true;
  if (url.origin !== self.location.origin) return true;
  if (url.pathname.startsWith("/api/")) return true;
  if (url.pathname.startsWith("/admin")) return true;
  // Pre-launch gate + countdown — never intercept (admin already bypassed above).
  if (url.pathname === "/launch") return true;
  return false;
}

function isStaticAsset(pathname) {
  if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }
  const lower = pathname.toLowerCase();
  return STATIC_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function isStylesheet(pathname) {
  return pathname.toLowerCase().includes(".css");
}

function isRuntimeUserAsset(pathname) {
  return pathname.startsWith("/sarjan-assets/client-avatars/");
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    networkPromise.catch(() => {});
    return cached;
  }

  const network = await networkPromise;
  return network || new Response("", { status: 504, statusText: "Offline" });
}

async function networkFirstNavigation(request) {
  try {
    // Never cache HTML — pass through to the network (redirects included).
    return await fetch(request, { redirect: "follow" });
  } catch {
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    return new Response("Offline", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

/** Prefer network for CSS so deploys never pair fresh HTML with stale styles. */
async function networkFirstAsset(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || Response.error();
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("sarjan-") &&
                key !== STATIC_CACHE &&
                key !== RUNTIME_CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (isSkippableRequest(request, url)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isStaticAsset(url.pathname)) {
    if (isStylesheet(url.pathname) || isRuntimeUserAsset(url.pathname)) {
      event.respondWith(networkFirstAsset(request, RUNTIME_CACHE));
      return;
    }
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
  }
});
