/* eslint-disable */
// hand-rolled on purpose (frozen-deps policy — no workbox). Content-hashed /_next/static
// assets never go stale and navigations are network-first, so deploys need no version bump
// here; bump only when this file's logic changes.
const VERSION = "v1"
const PRECACHE = `ds-precache-${VERSION}` // install-time shells + the offline sheep; survives logout
const PAGES_CACHE = `ds-pages-${VERSION}` // navigations cached as they happen; wiped on logout
const STATIC_CACHE = `ds-static-${VERSION}` // content-hashed /_next/static files
const ASSETS_CACHE = `ds-assets-${VERSION}` // /assets, /fonts, manifest…
const FALLBACK_PATH = "/dreams"
const OFFLINE_SHEEP = "/assets/sheep-offline.png"
const NAV_TIMEOUT_MS = 4000
const PAGES_LIMIT = 50
const STATIC_LIMIT = 300
const ASSET_LIMIT = 100

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE)
      // never "/": logged-in visitors get a 307 to /dreams there, and a redirected response
      // handed to a navigation is a network error. Offline, "/" falls through to the shell.
      let urls = [FALLBACK_PATH, OFFLINE_SHEEP]
      try {
        const res = await fetch("/sw-precache.json", { cache: "no-cache" })
        if (res.ok) urls = urls.concat(await res.json())
      } catch {}
      await Promise.allSettled(urls.map((url) => precache(cache, url)))
      await self.skipWaiting()
    })()
  )
})

async function precache(cache, url) {
  const res = await fetch(url, { cache: "no-cache" })
  if (res.ok && !res.redirected) await cache.put(pageKey(url), res)
}

// pages are keyed by pathname so /dreams?date=… and /dreams share one shell
function pageKey(url) {
  return new URL(url, self.location.origin).pathname
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = [PRECACHE, PAGES_CACHE, STATIC_CACHE, ASSETS_CACHE]
      for (const key of await caches.keys()) {
        if (key.startsWith("ds-") && !keep.includes(key)) await caches.delete(key)
      }
      await self.clients.claim()
    })()
  )
})

// logout hygiene — runtime-cached shells hold no private data, but leave nothing behind.
// The precache (public shells, the sheep) stays.
self.addEventListener("message", (event) => {
  if (event.data === "ds-logout") event.waitUntil(caches.delete(PAGES_CACHE))
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // RPC, and Next's per-page data (getServerSideProps, sent no-store) must never be served stale
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/data/")) return

  if (request.mode === "navigate") {
    event.respondWith(navigationHandler(event))
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(event, STATIC_CACHE, STATIC_LIMIT))
  } else if (/\.(png|jpe?g|webp|svg|gif|ico|woff2?|ttf|css|js|json)$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event, ASSETS_CACHE, ASSET_LIMIT))
  }
})

async function navigationHandler(event) {
  const { request } = event
  const key = pageKey(request.url)
  const network = fetch(request)
  // whatever the network eventually returns refreshes the shell — even after the timeout
  // below already handed the cached copy to the page. Registered first, so its clone runs
  // before anything consumes the body.
  event.waitUntil(
    network
      .then((res) => (res.ok ? putLimited(PAGES_CACHE, key, res.clone(), PAGES_LIMIT) : undefined))
      .catch(() => undefined)
  )
  const cached = await matchAny(key, [PAGES_CACHE, PRECACHE])
  if (cached) {
    // slow is not offline: give the network a moment, then serve the cached shell
    const res = await Promise.race([network.catch(() => undefined), delay(NAV_TIMEOUT_MS)])
    return res || cached
  }
  try {
    return await network
  } catch {
    // private pages SSR as static shells (no user data in the HTML) — safe to serve
    return (
      (await matchAny(FALLBACK_PATH, [PRECACHE, PAGES_CACHE])) ||
      new Response("you are offline and this page was never cached — Meh!", {
        status: 503,
        headers: { "Content-Type": "text/plain" },
      })
    )
  }
}

async function cacheFirst(event, cacheName, limit) {
  const { request } = event
  const cached = await safeMatch(cacheName, request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) event.waitUntil(putLimited(cacheName, request, response.clone(), limit))
    return response
  } catch {
    if (request.destination === "image") return offlineImage()
    return new Response("", { status: 504 })
  }
}

async function staleWhileRevalidate(event, cacheName, limit) {
  const { request } = event
  const cached = await safeMatch(cacheName, request)
  const network = fetch(request)
    .then((response) => {
      if (response.ok) event.waitUntil(putLimited(cacheName, request, response.clone(), limit))
      return response
    })
    .catch(() => undefined)
  if (cached) {
    event.waitUntil(network)
    return cached
  }
  const response = await network
  if (response) return response
  if (request.destination === "image") return offlineImage()
  return new Response("", { status: 504 })
}

async function offlineImage() {
  // the offline sheep, precached at install: every uncached image offline becomes a sheep,
  // even a never-visited blog cover. The gray SVG only covers a failed precache.
  const sheep = await safeMatch(PRECACHE, OFFLINE_SHEEP)
  if (sheep) return sheep
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 288">' +
    '<rect width="100%" height="100%" fill="#e0e0e0"/>' +
    '<text x="50%" y="50%" fill="#9e9e9e" font-family="sans-serif" font-size="20" text-anchor="middle">offline 🐑</text>' +
    "</svg>"
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml" } })
}

async function matchAny(key, cacheNames) {
  for (const name of cacheNames) {
    const hit = await safeMatch(name, key)
    if (hit) return hit
  }
  return undefined
}

// Cache Storage can fail (private mode, corrupted storage): never let that break a page
async function safeMatch(cacheName, key) {
  try {
    const cache = await caches.open(cacheName)
    return await cache.match(key)
  } catch {
    return undefined
  }
}

async function putLimited(cacheName, key, response, limit) {
  try {
    const cache = await caches.open(cacheName)
    await cache.put(key, response)
    const keys = await cache.keys()
    if (keys.length > limit) {
      await Promise.all(keys.slice(0, keys.length - limit).map((k) => cache.delete(k)))
    }
  } catch {}
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
