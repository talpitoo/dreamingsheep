/* eslint-disable */
// hand-rolled on purpose (frozen-deps policy — no workbox). Content-hashed /_next/static
// assets never go stale and navigations are network-first, so deploys need no version bump
// here; bump only when this file's logic changes.
const VERSION = "v2"
const PRECACHE = `ds-precache-${VERSION}` // install-time shells + the offline sheep; survives logout
const PAGES_CACHE = `ds-pages-${VERSION}` // navigations cached as they happen; wiped on logout
// content-hashed /_next/static files; unbounded (see fetch handler). Unversioned on purpose: hashed
// URLs never collide, and a VERSION bump must not delete the chunks an open session already
// loaded — the precached shell of the next offline cold start still needs them
const STATIC_CACHE = "ds-static"
const ASSETS_CACHE = `ds-assets-${VERSION}` // /assets, /fonts, manifest…
const FALLBACK_PATH = "/dreams"
const OFFLINE_SHEEP = "/assets/sheep-offline.png"
// blog covers (article pages, the blog index cards, "more from the blog") get their own stand-in
const OFFLINE_BLOG_COVER = "/assets/blog-offline.png"
// assets a page needs to look like itself offline, precached at install and never evicted (the
// asset cache drops its oldest entries past ASSET_LIMIT — the icon font was among the first in
// and the first out): the body's blur placeholders (src/styles/index.css: the lower of the two
// background layers per breakpoint, mobile below `sm` and desktop from `sm`, ~25 KB each — the
// ~300 KB progressive layer above them is left to fail offline, a failed layer does not paint and
// the placeholder shows through) and the icon font (src/styles/fonts.css lists the ttf first,
// which every browser picks; 80 KB). Keyed by pathname: the font's cache-busting query is ignored
const OFFLINE_ASSETS = [
  "/assets/background-canvas-mobile-blur-double-height.jpg",
  "/assets/background-canvas-blur.jpg",
  "/fonts/lucidicon.ttf?4vhl77",
]
const MANIFEST = "/sw-precache.json"
const NAV_TIMEOUT_MS = 4000
const PAGES_LIMIT = 50
const ASSET_LIMIT = 100
// the precache is caught up once per worker start (a worker lives ~30 s past its last event, so
// this is roughly once per app session): the manifest fetch below is a conditional request
let precacheChecked = false

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      await refreshPrecache()
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

// (re)populates the precache: at install, and again later so posts published after a user
// installed still end up offline (sw.js itself changes rarely, so install would otherwise be
// the only time this list is ever read). Only fetches URLs PRECACHE doesn't already have.
// Never "/": logged-in visitors get a 307 to /dreams there, and a redirected response can't be
// replayed to a later navigation — FALLBACK_PATH is "/"'s shell instead.
async function refreshPrecache() {
  try {
    const cache = await caches.open(PRECACHE)
    let urls = [FALLBACK_PATH, OFFLINE_SHEEP, OFFLINE_BLOG_COVER, ...OFFLINE_ASSETS]
    try {
      const res = await fetch("/sw-precache.json", { cache: "no-cache" })
      if (res.ok) {
        // the manifest itself is kept too: offlineImage reads the cover names from it
        await cache.put(MANIFEST, res.clone())
        const manifest = await res.json()
        urls = urls.concat(Array.isArray(manifest) ? manifest : manifest.pages || [])
      }
    } catch {}
    const missing = []
    for (const url of urls) {
      if ((await safeMatch(PRECACHE, pageKey(url))) === undefined) missing.push(url)
    }
    await Promise.allSettled(missing.map((url) => precache(cache, url)))
  } catch {}
}

// no network I/O here: until activate settles, every fetch of the pages this worker controls
// (RPC POSTs included) waits for it. install already filled the precache.
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

// logout hygiene — runtime-cached shells hold no private data, but leave nothing behind, and
// only a logged-in session's shells may stand in for a slow "/" (AuthGuard sends the same
// message when an authenticated page renders to nobody). The precache (public shells, the
// sheep) stays.
self.addEventListener("message", (event) => {
  if (event.data === "ds-logout") event.waitUntil(caches.delete(PAGES_CACHE))
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) {
    // a few blog covers live on other hosts: never cached or otherwise touched, but when the
    // fetch fails (offline) they get the same stand-in as our own covers — the only way to
    // help a precached page that could not hydrate, where the img's own error handler is dead
    if (request.destination === "image") {
      event.respondWith(fetch(request).catch(() => offlineImage(event)))
    }
    return
  }
  // RPC, and Next's per-page data (getServerSideProps, sent no-store) must never be served stale
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/data/")) return

  if (request.mode === "navigate") {
    event.respondWith(navigationHandler(event))
  } else if (url.pathname.startsWith("/_next/static/")) {
    // no count cap: entries are content-hashed so they never go stale, and the set grows
    // slowly, but cacheFirst never re-puts a hit on access, so a FIFO cap would evict the
    // oldest entries first — exactly the long-lived shared chunks (framework/main/_app) the
    // current build still needs. The browser's own storage eviction is the backstop.
    event.respondWith(cacheFirst(event, STATIC_CACHE))
  } else if (/\.(png|jpe?g|webp|svg|gif|ico|woff2?|ttf|css|js|json)$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event, ASSETS_CACHE, ASSET_LIMIT))
  }
})

async function navigationHandler(event) {
  const { request } = event
  const key = pageKey(request.url)
  // a logged-in "/" is always a redirect and never gets its own cache entry — look up the
  // shell as "/"'s offline stand-in instead of falling through to the network's own TCP
  // timeout on an up-but-dead connection (the installed app launches at "/"). Only the runtime
  // cache can stand in for "/": a logged-out visitor has no /dreams there — it is wiped at
  // logout and whenever an authenticated page renders to nobody (AuthGuard in _app) — so a slow
  // landing page is waited for instead of being replaced by the journal's shell
  const lookupKey = key === "/" ? FALLBACK_PATH : key
  const network = fetch(request)
  // whatever the network eventually returns refreshes the shell — even after the timeout
  // below already handed the cached copy to the page. Registered first, so its clone runs
  // before anything consumes the body.
  event.waitUntil(
    network
      .then((res) => {
        if (!res.ok) return undefined
        // posts publish after users install; catch up the precache on the first successful
        // navigation of this worker's life (the Blog link is a client-side navigation, so a
        // /blog-only hook would hardly ever run)
        if (!precacheChecked) {
          precacheChecked = true
          event.waitUntil(refreshPrecache())
        }
        // a logged-in "/" never gets this far: navigations fetch with redirect mode "manual", so
        // its 307 is an opaqueredirect that `!res.ok` already rejected. What is left is the
        // logged-out landing page, which must never shadow the shell "/" is served offline
        if (key === "/") return undefined
        return putLimited(PAGES_CACHE, key, res.clone(), PAGES_LIMIT)
      })
      .catch(() => undefined)
  )
  // only a shell that came from a real navigation is good enough to serve while the network is
  // merely slow: its chunks went through cacheFirst, and it is refreshed on every online visit.
  // The precache is the install-day build — after a deploy its /_next/static chunks are gone from
  // the server, so serving it online would 404 its own scripts; it is for offline only (below)
  const cached = await matchAny(lookupKey, [PAGES_CACHE])
  if (cached) {
    // slow is not offline: give the network a moment, then serve the cached shell
    const res = await Promise.race([network.catch(() => undefined), delay(NAV_TIMEOUT_MS)])
    return res || cached
  }
  try {
    return await network
  } catch {
    // offline: the page's own precached shell if it has one (FAQ, blog), else the journal's shell
    // — private pages SSR as static shells (no user data in the HTML), safe to serve. PAGES_CACHE
    // first: it is refreshed on every online visit, PRECACHE is only the install-day build.
    return (
      (await matchAny(lookupKey, [PRECACHE])) ||
      (await matchAny(FALLBACK_PATH, [PAGES_CACHE, PRECACHE])) ||
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
    if (request.destination === "image") return offlineImage(event)
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
  // the precache keeps the few assets a page needs to look like itself offline (OFFLINE_ASSETS),
  // keyed by pathname like the pages, so a query string on the request does not matter
  const precached = await safeMatch(PRECACHE, new URL(request.url).pathname)
  if (precached) return precached
  if (request.destination === "image") return offlineImage(event)
  return new Response("", { status: 504 })
}

async function offlineImage(event) {
  // every uncached image offline gets a stand-in, both precached at install: blog covers the
  // generic cover, everything else the offline sheep — except the app's own handwritten
  // titles and logo (static imports named title-*/logo-*), which vanish rather than turn into
  // a tiny sheep. A cover is recognised by name: the build lists every post's cover in the
  // manifest (they are called anything — blog-*, sheep-matrix, a pexels photo), and the name
  // is the same whether the file comes from /assets, as a content-hashed static import or
  // from another host. Pages cannot tell: a client's URL is its creation URL and does not
  // follow in-app navigation. The gray SVG only covers a failed precache.
  const url = new URL(event.request.url)
  const file = url.pathname.split("/").pop() || ""
  // a CSS background is an "image" request too, but a stand-in for one is painted across the
  // whole canvas (the sheep stretched to 600×1920 on phones, to `cover` on desktops — v6.0.0).
  // The precached placeholders were already served by staleWhileRevalidate; anything else fails,
  // which is what the browser does without a worker: the layer does not paint, what is under it
  // shows
  if (isCssBackground(file)) return new Response("", { status: 504 })
  const isStatic = url.pathname.startsWith("/_next/static/")
  if (isStatic && (file.startsWith("title-") || file.startsWith("logo-"))) return transparentImage()
  const name = file.split(".")[0]
  // a sheep drawing is a page sheep first, even where a post borrows it as its cover
  // (sheep-privacy, sheep-matrix): the offline sheep is its natural stand-in
  const cover =
    !file.startsWith("sheep-") && (file.startsWith("blog-") || (await coverNames()).includes(name))
  const standIn = cover ? OFFLINE_BLOG_COVER : OFFLINE_SHEEP
  const cached = (await safeMatch(PRECACHE, standIn)) || (await safeMatch(PRECACHE, OFFLINE_SHEEP))
  if (cached) return cached
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 288">' +
    '<rect width="100%" height="100%" fill="#e0e0e0"/>' +
    '<text x="50%" y="50%" fill="#9e9e9e" font-family="sans-serif" font-size="20" text-anchor="middle">offline 🐑</text>' +
    "</svg>"
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml" } })
}

async function coverNames() {
  try {
    const manifest = await safeMatch(PRECACHE, MANIFEST)
    const data = manifest ? await manifest.json() : null
    return (data && !Array.isArray(data) && data.covers) || []
  } catch {
    return []
  }
}

// every url() the stylesheets reference: the body canvas layers (src/styles/index.css) and the
// contained button texture (src/styles/Theme.ts). By name, as a worker cannot tell a CSS
// background from an <img> — both arrive as destination "image"
function isCssBackground(file) {
  return file.startsWith("background-") || file === "button.jpg"
}

function transparentImage() {
  return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>', {
    headers: { "Content-Type": "image/svg+xml" },
  })
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
    if (limit === undefined) return
    const keys = await cache.keys()
    if (keys.length > limit) {
      await Promise.all(keys.slice(0, keys.length - limit).map((k) => cache.delete(k)))
    }
  } catch {}
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
