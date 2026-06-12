/* Sarjan Textiles — service worker retired (was breaking navigation with ERR_FAILED). */

const SW_VERSION = "sarjan-storefront-20260612-disabled";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

/** Do not intercept fetches — pass everything to the network. */
self.addEventListener("fetch", () => {});
