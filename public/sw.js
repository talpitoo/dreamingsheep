/* eslint-disable */
// hand-rolled on purpose (frozen-deps policy — no workbox). Content-hashed
// /_next/static assets never go stale and navigations are network-first, so
// deploys need no version bump here; bump only when this file's logic changes.
const VERSION = "v1"
const STATIC_CACHE = `ds-static-${VERSION}`
const PAGES_CACHE = `ds-pages-${VERSION}`
const ASSETS_CACHE = `ds-assets-${VERSION}`
const FALLBACK_PATH = "/dreams"
const OFFLINE_SHEEP = "/assets/sheep-offline.png"
const ASSET_LIMIT = 100

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGES_CACHE)
      let urls = ["/", FALLBACK_PATH, OFFLINE_SHEEP]
      try {
        const res = await fetch("/sw-precache.json", { cache: "no-cache" })
        if (res.ok) urls = urls.concat(await res.json())
      } catch {}
      await Promise.allSettled(urls.map((url) => cache.add(url)))
      await self.skipWaiting()
    })()
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = [STATIC_CACHE, PAGES_CACHE, ASSETS_CACHE]
      for (const key of await caches.keys()) {
        if (key.startsWith("ds-") && !keep.includes(key)) await caches.delete(key)
      }
      await self.clients.claim()
    })()
  )
})

// logout hygiene — the shells hold no private data, but leave nothing behind
self.addEventListener("message", (event) => {
  if (event.data === "ds-logout") caches.delete(PAGES_CACHE)
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith("/api/")) return

  if (request.mode === "navigate") {
    event.respondWith(navigationHandler(request))
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
  } else if (/\.(png|jpe?g|webp|svg|gif|ico|woff2?|ttf|css|js|json)$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, ASSETS_CACHE))
  }
})

async function navigationHandler(request) {
  const cache = await caches.open(PAGES_CACHE)
  try {
    const response = await fetchWithTimeout(request, 4000)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    // private pages SSR as static shells (no user data in the HTML) — safe to serve.
    // ignoreSearch: /dreams?date=... finds the cached /dreams shell
    const cached = await cache.match(request, { ignoreSearch: true })
    if (cached) return cached
    const fallback = await cache.match(FALLBACK_PATH)
    if (fallback) return fallback
    return new Response("you are offline and this page was never cached — Meh!", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    })
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, response.clone())
        trimCache(cache, ASSET_LIMIT)
      }
      return response
    })
    .catch(() => undefined)
  const response = cached || (await network)
  if (response) return response
  // offline and never cached: the offline sheep for images (public/assets is 37MB —
  // images are cached only as viewed, never precached), plain 504 for the rest
  if (request.destination === "image") return offlineImage()
  return new Response("", { status: 504 })
}

async function offlineImage() {
  // the offline sheep, precached at install; every uncached image offline becomes a
  // sheep — even unvisited blog covers. Gray SVG until the asset lands in the repo.
  const cache = await caches.open(PAGES_CACHE)
  const sheep = await cache.match(OFFLINE_SHEEP)
  if (sheep) return sheep
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 288">' +
    '<rect width="100%" height="100%" fill="#e0e0e0"/>' +
    '<text x="50%" y="50%" fill="#9e9e9e" font-family="sans-serif" font-size="20" text-anchor="middle">offline 🐑</text>' +
    "</svg>"
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml" } })
}

async function trimCache(cache, limit) {
  const keys = await cache.keys()
  if (keys.length > limit) await cache.delete(keys[0])
}

function fetchWithTimeout(request, ms) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return fetch(request, { signal: controller.signal }).finally(() => clearTimeout(timer))
}
