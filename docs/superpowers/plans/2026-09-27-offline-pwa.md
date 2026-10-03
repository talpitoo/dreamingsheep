# Offline PWA Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A logged-in user of the installed ("Add to home screen") app can open dreamingsheep offline, land on a rendered `/dreams` page, enter dreams (text + toggle options; attaching cached symbols as a bonus), keep them across refreshes, and have them synced to the DB when connectivity returns — even days later.

**Architecture:** Four separable layers, shipped in order, each useful without the next: (A) a hand-written service worker so the app shell survives offline refresh/cold start; (B) an offline-aware data layer in the owned core — an online-status hook plus allowlisted query persistence to localStorage — so pages render last-known data instead of hanging; (C) a localStorage dream outbox with a replay engine triggered by the `online` event/app start; (D) offline UX — global banner, pending-dream list/calendar marks, settings notice, error-boundary offline branch.

**Tech Stack:** Only already-pinned deps: Next 16.2 pages router, react-query 4.32 (via `src/core/rpc-client`), superjson, luxon (dreams page), uuid, MUI 5 + Tailwind 4 (no `sx`!), vitest (node env, pure helpers only), puppeteer e2e.

**Spec:** `docs/superpowers/specs/2026-09-27-offline-pwa-design.md`

## Global Constraints

- **Frozen dependencies**: zero new packages. No workbox, no next-pwa, no @tanstack persist packages.
- **No `sx` prop** — ESLint errors on it. Tailwind classes for layout/spacing; important modifier is a suffix (`z-1400!` style).
- Prettier: no semicolons, printWidth 100.
- Unit tests are **pure helpers only** (vitest `environment: "node"`); never import `db`'s default export in unit-tested paths; hooks/components stay thin and untested at unit level.
- Every offline storage key embeds the userId: `ds.outbox.<userId>`, `ds.queries.<userId>`; all of it purged on logout (privacy-first).
- Service worker: **GET-only, same-origin only, never `/api/*`**.
- Date handling on the dreams page uses **luxon** (matching the file's existing import).
- User-facing copy is placeholder in the maintainer's playful voice (lowercase "i"); flag every string for the maintainer's rewrite in the PR description.
- **Offline sheep asset**: `public/assets/sheep-offline.png` (same style and naming as the other `sheep-<page>.png`; their sources are 1300×1300 PNGs rendered at 384 CSS px) — the face of all offline states. The maintainer will draw the real one _after_ this lands; Task 4 Step 0 generates a **grayscale PLACEHOLDER** from the dreams sheep so the static imports in Tasks 6 and 8 build. Flag it as a placeholder in the PR description.
- **Working tree caveat**: the checkout carries the maintainer's uncommitted `.gitignore` line (`MARKETING*.md`). **Never `git add .gitignore` or `git add -A`/`git commit -a`** — stage files by explicit path. Task 4 edits `.gitignore` via a stash dance (recipe there). No other task touches that file.
- Commit messages follow the repo's `feat:`/`fix:` style and end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- JSX text nodes containing HTML entities: leading space must be `&#32;` glued to the previous tag (SWC gotcha, see src/CLAUDE.md).

## Review Focus

Spec-implied failure modes, each pinned by a test in the owning task:

1. **Storage unavailable or full** (private mode, quota): enqueue surfaces a form error instead of pretending to save; query persistence silently no-ops; the app keeps working online. → Task 2 (`throwing storage` test), Task 3 (`persist swallows setItem errors` test).
2. **Corrupted outbox/persistence JSON** (interrupted write): reads return empty instead of throwing and taking the page down with them. → Task 2 + Task 3 (`corrupt payload returns empty` tests).
3. **Second tab removed an entry mid-sync**: the sync engine re-reads storage before each send and skips vanished entries — no double POST from the same device state. → Task 2 (`entry removed mid-run is skipped` test).
4. **Session expired at sync time** (trip longer than the 30-day sliding TTL): queue is kept untouched, `authRequired` reported, retry after login uses the freshly rotated CSRF cookie because `rpcFetch` reads it per call. → Task 2 (`AuthenticationError halts and preserves queue` test).
5. **A validation-rejected entry must not dam the queue**: it records `lastError`, is skipped on subsequent runs, stays visible for manual delete; later entries still sync. → Task 2 (`bad entry is skipped, rest syncs` test).

---

### Task 1: Online-status primitives (`src/core/offline/onlineStatus.ts`)

**Files:**

- Create: `src/core/offline/onlineStatus.ts`

**Interfaces:**

- Consumes: nothing.
- Produces: `isBrowserOnline(): boolean` (safe on server → `true`), `useOnlineStatus(): boolean` (React hook, `useSyncExternalStore` over `online`/`offline` events). Every later task's offline check goes through these two.

- [ ] **Step 1: Implement** (no unit test — browser-API-thin, per the repo's unit-test policy; exercised by the Task 11 e2e)

```ts
import { useSyncExternalStore } from "react"

// mirrors the tiny-external-store pattern of src/auth/client.ts
function subscribe(callback: () => void) {
  window.addEventListener("online", callback)
  window.addEventListener("offline", callback)
  return () => {
    window.removeEventListener("online", callback)
    window.removeEventListener("offline", callback)
  }
}

export function isBrowserOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, isBrowserOnline, () => true)
}
```

- [ ] **Step 2: Verify** — run `npm run type:check` and `npm run lint`. Expected: clean.

- [ ] **Step 3: Commit** — `git add src/core/offline/onlineStatus.ts && git commit` (`feat(offline): online-status hook`).

---

### Task 2: Dream outbox core (`src/dreams/offline/outbox.ts`) — TDD

**Files:**

- Create: `src/dreams/offline/outbox.ts`
- Test: `src/dreams/offline/outbox.test.ts`

**Interfaces:**

- Consumes: `superjson`, `uuid` (`v4`).
- Produces (used by Tasks 5–7, 9):

```ts
export interface OutboxStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}
export interface PendingDream {
  clientId: string // uuid
  userId: number
  values: Record<string, unknown> // CreateDream-shaped; dreamAt already an ISO string
  queuedAt: Date
  lastError?: string // set when the server rejected it permanently (Ruling R6)
  attempts?: number // transient failures so far; parked at MAX_TRANSIENT_ATTEMPTS (Ruling R6)
}
export interface SyncResult {
  synced: number
  authRequired: boolean
  blocked: boolean // network failure mid-run; retry on next trigger
}
export function outboxKey(userId: number): string // `ds.outbox.${userId}`
export function readOutbox(storage: OutboxStorage, userId: number): PendingDream[]
export function enqueueDream(
  storage: OutboxStorage,
  userId: number,
  values: Record<string, unknown>
): PendingDream // throws OutboxWriteError when storage is unusable
export class OutboxWriteError extends Error {}
export function removeFromOutbox(storage: OutboxStorage, userId: number, clientId: string): void
export function retryOutboxEntry(storage: OutboxStorage, userId: number, clientId: string): void // Ruling R6
export const MAX_TRANSIENT_ATTEMPTS = 10 // Ruling R6
export function clearOutbox(storage: OutboxStorage, userId: number): void
export async function syncOutbox(
  storage: OutboxStorage,
  userId: number,
  send: (values: Record<string, unknown>) => Promise<unknown>
): Promise<SyncResult>
export function subscribeOutbox(listener: () => void): () => void // change notification
```

Behavioral contract for `syncOutbox` (this is the whole design, write the tests from it):
in insertion order; **re-read storage before each entry** and skip entries no longer present
(two-tab safety); skip entries with `lastError` set; on `send` success remove the entry and
notify subscribers; on error — `error instanceof TypeError` (fetch network failure) → stop,
`{ blocked: true }`, queue untouched; `error.name === "AuthenticationError"` → stop,
`{ authRequired: true }`, queue untouched (same for `CSRFTokenMismatchError`); **permanent**
rejections — `name` is `ZodError`/`AuthorizationError`/`NotFoundError`, or `statusCode` 4xx —
→ write `lastError: String(error)` onto the entry, continue with the next; **everything else is
transient** (5xx, nginx's maintenance page on 502/503/504, unknown errors) → persist
`attempts + 1` on the entry and stop with `{ blocked: true }`, except that an entry reaching
`MAX_TRANSIENT_ATTEMPTS` (10) is stamped `lastError` and skipped so one broken entry cannot dam
the queue forever (controller Ruling R6, 2026-09-27). `retryOutboxEntry(storage, userId, clientId)` clears `lastError`/`attempts` for the UI's "retry" button. Corrupt stored JSON →
`readOutbox` returns `[]`.
`enqueueDream` requires a positive `userId` (throws `OutboxWriteError` otherwise) and wraps
`setItem` failures in `OutboxWriteError`.

- [ ] **Step 1: Write the failing tests** — `src/dreams/offline/outbox.test.ts` with a `fakeStorage()` helper (`Map`-backed object implementing `OutboxStorage`). Cover, as separate `it()` blocks:

  - enqueue → readOutbox round-trips values, `queuedAt` is a `Date` (superjson), insertion order preserved for same-millisecond entries
  - `readOutbox` with corrupt payload (`storage.setItem(key, "{oops")`) returns `[]`
  - `enqueueDream` with a storage whose `setItem` throws → throws `OutboxWriteError`; with `userId: 0` → throws `OutboxWriteError`
  - `removeFromOutbox` removes only the matching clientId; `clearOutbox` empties
  - `syncOutbox` happy path: 3 entries, `send` resolves → `{ synced: 3 }`, storage empty, entries sent oldest-first
  - `syncOutbox` network stop: `send` rejects with `new TypeError("Failed to fetch")` on entry 2 → `{ synced: 1, blocked: true }`, entries 2+3 still stored
  - `syncOutbox` auth stop: `send` rejects with `Object.assign(new Error("x"), { name: "AuthenticationError" })` → `{ synced: 0, authRequired: true }`, queue untouched
  - `syncOutbox` validation skip: entry 1 rejects with a plain `Error("nope")` → entry 1 kept with `lastError: "Error: nope"`, entries 2+3 synced, `{ synced: 2 }`; a second `syncOutbox` run does not re-send entry 1
  - two-tab race: `send` for entry 1 also calls `removeFromOutbox` for entry 2 before resolving → entry 2 is never sent (re-read semantics)
  - `subscribeOutbox` fires on enqueue/remove/clear, unsubscribe stops it

- [ ] **Step 2: Run** `npm test -- outbox` — expected: FAIL (module not found).

- [ ] **Step 3: Implement `outbox.ts`** exactly to the contract above (~90 lines; module-level `Set` of listeners like `src/auth/client.ts`; `superjson.stringify`/`parse` for the array; `try/catch` in `readOutbox`).

- [ ] **Step 4: Run** `npm test -- outbox` — expected: PASS. Also `npm run type:check`.

- [ ] **Step 5: Commit** (`feat(offline): dream outbox with replay-safe sync core`).

---

### Task 3: Allowlisted query persistence (`src/core/offline/persistedQueries.ts`) — TDD

**Files:**

- Create: `src/core/offline/querySnapshot.ts` (pure decode/select/encode policy — Ruling R17, split out during review)
- Create: `src/core/offline/persistedQueries.ts` (allowlist + QueryClient glue; re-exports the limits)
- Test: `src/core/offline/querySnapshot.test.ts`, `src/core/offline/persistedQueries.test.ts`

**Interfaces:**

- Consumes: `OutboxStorage` type from Task 2 (re-export it from a shared spot or import across — import `{ OutboxStorage }` from `src/dreams/offline/outbox` is fine), `QueryClient` from `@tanstack/react-query`, `superjson`.
- Produces (used by Tasks 7, 8, 9):

> **Superseded during review (2026-10-03, Copilot):** `getUser` is NOT persisted — it returns the full user row, `hashedPassword` included, which must never sit in localStorage. Settings renders nothing offline anyway. `getCurrentUser` is the limited profile the pages read.

```ts
export const PERSISTED_QUERY_KEYS = [
  "getCurrentUser",
  "getUser",
  "getDreams",
  "getDreamsByMonth",
  "getSymbols",
  "get-symbols-autocomplete", // the dream form's picker: it passes an explicit queryKey (Ruling R3, amended 2026-09-28)
] as const
export function persistedQueriesKey(userId: number): string // `ds.queries.${userId}`
export const MAX_PERSISTED_QUERIES = 50 // newest-by-dataUpdatedAt cap of the merged snapshot (Ruling R11)
export function persistQueries(storage: OutboxStorage, userId: number, qc: QueryClient): void
export function hydratePersistedQueries(
  storage: OutboxStorage,
  userId: number,
  qc: QueryClient
): void
export function subscribeQueryPersistence(
  storage: OutboxStorage,
  userId: number,
  qc: QueryClient
): () => void // debounced (~1s) queryCache subscription; returns unsubscribe
export function clearPersistedQueries(storage: OutboxStorage, userId: number): void
```

Contract: `persistQueries` **merges** — it starts from the previously stored snapshot and
overlays every allowlisted cache entry that has data (`dataUpdatedAt > 0`, any status —
react-query garbage-collects unobserved queries after 5 minutes and a failed refetch leaves
`status: "error"` with the data kept; neither may erase the offline copy), keyed by
queryKey (newer `dataUpdatedAt` wins), capped at `MAX_PERSISTED_QUERIES = 50` newest AND at
`PERSIST_BUDGET_CHARS = 1_500_000` total / `PERSIST_ENTRY_MAX_CHARS = 256_000` per entry
(whole-journal stats variants never fit; the dreams page's entries always do — Ruling R14),
skipping entries with `state.isInvalidated` and dropping their stored copies (Ruling R15),
`removeItem` when empty (controller Ruling R11, 2026-09-27); stored as
`{ queryKey, data, dataUpdatedAt }[]`
(superjson-stringified; `setItem` failures swallowed); the subscription persists only on
`updated`/`success` cache events (every render re-arms otherwise). `hydratePersistedQueries`
validates every entry before applying any (object, allowlisted array `queryKey`, finite
`dataUpdatedAt`, data present), then replays via
`qc.setQueryData(queryKey, data, { updatedAt: dataUpdatedAt })` — only where the cache has
no data or older data — so react-query serves it instantly but refetches when online
(corrupt payload → no-op).

- [ ] **Step 1: Write the failing tests** — instantiate a real `new QueryClient()` in node (works without DOM), seed it with `qc.setQueryData(["getDreams", "params"], { dreams: [], count: 0 })` and `qc.setQueryData(["notAllowlisted", "x"], 1)`. Cover: persist→hydrate round-trip into a fresh QueryClient restores only allowlisted keys with their `dataUpdatedAt`; corrupt payload no-ops; `setItem` throwing is swallowed; `clearPersistedQueries` removes the key; subscription persists after a cache write (use `vi.useFakeTimers()` + `vi.advanceTimersByTime(1100)` for the debounce) and stops after unsubscribe.

- [ ] **Step 2: Run** `npm test -- persistedQueries` — expected: FAIL.

- [ ] **Step 3: Implement** (~80 lines; debounce with a module `setTimeout` handle, no lodash needed).

- [ ] **Step 4: Run** `npm test -- persistedQueries` + `npm run type:check` — expected: PASS.

- [ ] **Step 5: Commit** (`feat(offline): allowlisted query persistence for offline reads`).

---

### Task 4: Service worker, registration, precache manifest

**Files:**

- Create: `public/assets/sheep-offline.png` (PLACEHOLDER — grayscale copy of the dreams sheep, maintainer replaces with the real drawing)
- Create: `public/sw.js` (plain JS, outside the TS build)
- Create: `scripts/generate-sw-precache.mjs`
- Create: `src/core/offline/swRegistration.ts`
- Modify: `next.config.js` (add `headers()`)
- Modify: `package.json` (`"build": "node scripts/generate-sw-precache.mjs && next build"`)
- Modify: `.gitignore` (add `public/sw-precache.json`)

**Interfaces:**

- Consumes: nothing from other tasks.
- Produces: `registerServiceWorker(): void` (called from `_app` in Task 7); the SW itself answers a `"ds-logout"` message (Task 9) by clearing the pages cache.

- [ ] **Step 0: Placeholder offline sheep** — the maintainer draws the real one later; generate a stand-in with the already-pinned `sharp` so everything downstream builds and the worker has something to precache:

```bash
node -e "require('sharp')('public/assets/sheep-dreamingsheep.png').grayscale().modulate({ brightness: 1.15 }).png().toFile('public/assets/sheep-offline.png').then(() => console.log('placeholder written'))"
```

Expected: `public/assets/sheep-offline.png` exists, 384×384 (`node -e "require('sharp')('public/assets/sheep-offline.png').metadata().then(m => console.log(m.width, m.height))"`). This file is committed with this task and listed as a PLACEHOLDER in the PR description.

> **Superseded during review (2026-09-27, Rulings R19/R20):** the worker below had a Critical defect — precaching `/` while logged in stores the 307→/dreams as a _redirected_ response, which a navigation cannot use offline — plus stale `/_next/data` caching, precache wiped on logout, slow-treated-as-offline, and lost registration after `load`. The committed `public/sw.js` / `swRegistration.ts` are the authority: separate `ds-precache-v1` (no `/`, `ok && !redirected` only), pathname-keyed pages, `/_next/data/` pass-through, non-aborting 4 s race, `waitUntil`ed capped puts, sheep fallback for all images, `persist()` only in standalone mode.

- [ ] **Step 1: Write `public/sw.js`**

```js
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
```

- [ ] **Step 2: Write `scripts/generate-sw-precache.mjs`** — lists every `src/pages/blog/*/` post folder and writes `public/sw-precache.json` as `["/faq", "/blog", "/blog/<slug>", …]`. **All** posts, not a recent subset (maintainer's call, 2026-09-27): the prerendered HTML of ~12 posts is well under 1MB combined because cover images are never precached — offline they degrade to the SW's gray placeholder. No frontmatter parsing needed:

```js
import { readdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const blogDir = join(process.cwd(), "src/pages/blog")
const slugs = readdirSync(blogDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => `/blog/${entry.name}`)
  .sort()

const urls = ["/faq", "/blog", ...slugs]
writeFileSync(join(process.cwd(), "public/sw-precache.json"), JSON.stringify(urls, null, 2))
console.log(`sw-precache.json: ${urls.length} URLs`)
```

(Note: the page sheep/title images are next/image **static imports**, served as content-hashed `/_next/static/media/*` — the cache-first static route picks them up on first online view, so the dreams sheep is offline-available without any precache entry.)

- [ ] **Step 3: Write `src/core/offline/swRegistration.ts`**

```ts
export function registerServiceWorker(): void {
  if (typeof window === "undefined") return
  if (process.env.NODE_ENV !== "production") return
  if (!("serviceWorker" in navigator)) return
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined)
    // resist storage eviction on multi-day offline trips (Chromium honors it; iOS ignores)
    navigator.storage?.persist?.().catch(() => undefined)
  })
}
```

- [ ] **Step 4: `next.config.js` headers + build script + .gitignore**

```js
  async headers() {
    return [
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
      { source: "/sw-precache.json", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ]
  },
```

`package.json`: `"build": "node scripts/generate-sw-precache.mjs && next build"`.

`.gitignore` needs a `public/sw-precache.json` line, but the file carries the maintainer's uncommitted `MARKETING*.md` line, which must stay uncommitted. Stash dance — put the new rule near the other build outputs at the TOP of the file (a different hunk from the maintainer's trailing line), never at the end:

```bash
git stash push -- .gitignore                 # park the maintainer's local line
# add "public/sw-precache.json" right under the ".next/" (build output) entry
git add .gitignore
git commit -m "chore: ignore the generated sw-precache.json" # (+ attribution line)
git stash pop                                # maintainer's line comes back, uncommitted
git diff --stat .gitignore                   # expected: 1 file changed, 1 insertion (theirs only)
```

- [ ] **Step 5: Verify** — `node scripts/generate-sw-precache.mjs` prints the URL count (should be ~14: /faq, /blog, one per post folder); `npm run build` succeeds; `npm run lint` clean.

- [ ] **Step 6: Commit** (`feat(offline): hand-rolled service worker, registration and precache manifest`) — stage by explicit path: `git add public/sw.js public/assets/sheep-offline.png scripts/generate-sw-precache.mjs src/core/offline/swRegistration.ts next.config.js package.json` (`.gitignore` was committed separately in Step 4).

---

### Task 5: Offline submit path + snackbar on the dreams page

**Files:**

- Modify: `src/pages/dreams/index.tsx` (the `onSubmit` in `DreamsPage`, ~line 298)

**Interfaces:**

- Consumes: `isBrowserOnline` (Task 1), `enqueueDream`, `OutboxWriteError` (Task 2), `clearPersistedQueries` (Task 3, Ruling R16), `useSession` from `src/auth/client`, MUI `Snackbar` (pattern: `src/sleepingTimes/components/SleepingTimeForm.tsx:286`).
- Produces: dreams entered offline land in the outbox with the exact same `values` (incl. computed `dreamAt` ISO string) the online path would have POSTed.

- [ ] **Step 1: Implement.** In `DreamsPage`: add `const session = useSession()` and `const [offlineSnackbar, setOfflineSnackbar] = useState(false)`. Extract the queueing into a local helper and rewrite the tail of `onSubmit` (after `values.dreamAt` is computed — keep that code identical):

```tsx
const queueOffline = (values: any) => {
  if (!session.userId) return { [FORM_ERROR]: "please log in to save dreams" }
  try {
    try {
      enqueueDream(window.localStorage, session.userId, values)
    } catch (error) {
      if (!(error instanceof OutboxWriteError)) throw error
      // the dream outranks the offline read cache: free its space and try once more
      clearPersistedQueries(window.localStorage, session.userId)
      enqueueDream(window.localStorage, session.userId, values)
    }
  } catch (error) {
    if (error instanceof OutboxWriteError)
      return { [FORM_ERROR]: "couldn't save on this device — storage seems unavailable" }
    throw error
  }
  setShowForm(false)
  setOfflineSnackbar(true)
  return { [FORM_RESET]: true }
}
```

(`clearPersistedQueries` from `src/core/offline/persistedQueries` — Ruling R16.)

and in `onSubmit`, replacing the plain `await createDreamMutation(values)` block:

```tsx
if (!isBrowserOnline()) return queueOffline(values)
try {
  await createDreamMutation(values)
  invalidateQuery(getDreams)
  invalidateQuery(getDreamsByMonth)
  setShowForm(false)
  return { [FORM_RESET]: true }
} catch (error: any) {
  // navigator.onLine lied (flaky network): fetch itself failed — fall back to the outbox
  if (error instanceof TypeError) return queueOffline(values)
  return { [FORM_ERROR]: error.toString() }
}
```

Add next to the existing form markup:

```tsx
<Snackbar
  open={offlineSnackbar}
  autoHideDuration={6000}
  onClose={() => setOfflineSnackbar(false)}
  message="dream tucked away on this device — it syncs when you're back online 🌙"
/>
```

- [ ] **Step 2: Verify empirically** (per the `verify` skill): `npm run dev`, log in as `zhuangzi@dreamingsheep.net`/`zhuangzi`, DevTools → Network → Offline, add a dream → snackbar appears, form closes, `localStorage["ds.outbox.<id>"]` holds it. `npm run type:check` + `npm run lint` clean.

- [ ] **Step 3: Commit** (`feat(offline): queue dreams in the outbox when offline`).

---

### Task 6: Pending dreams visible — list badge + calendar marks + no-cache guards

**Files:**

- Create: `src/dreams/offline/usePendingDreams.ts`
- Create: `src/dreams/components/PendingDreamList.tsx`
- Modify: `src/pages/dreams/index.tsx` (`DreamsList`, `DreamsCalendar`)

**Interfaces:**

- Consumes: `readOutbox`, `removeFromOutbox`, `subscribeOutbox`, `PendingDream` (Task 2), `useSession`, `useOnlineStatus` (Task 1), `queryKeyFor`/`getQueryClient` from `src/core/rpc-client`, `DreamItemFooter` from `src/dreams/components/DreamList`.
- Produces: `usePendingDreams(): PendingDream[]` (current user's queue, live via `useSyncExternalStore`; snapshot cached on the raw storage string exactly like `src/auth/client.ts` caches the cookie — never re-parse into a fresh array reference per call, that loops the store); `<PendingDreamList dateIso={string} />` rendering the queued entries for one local day.

- [ ] **Step 1: `usePendingDreams.ts`** — `useSyncExternalStore(subscribeOutbox, cachedSnapshotForUser, () => EMPTY_ARRAY)` keyed on `useSession().userId`; server snapshot `[]`.

- [ ] **Step 2: `PendingDreamList.tsx`** — filter `usePendingDreams()` to entries whose `DateTime.fromISO(values.dreamAt).setZone(userTimezone).toISODate() === dateIso`; render each as a `Card` (`className="mb-4"`): title + description as `Typography`, `DreamItemFooter` fed from `values` (`time/mood/recall/type/symbols`), a caption row "waiting to sync <HourglassTopIcon className="opacity-50" />" (or the entry's `lastError` in `text-mui-error` when set), and a small "discard" `Button` calling `removeFromOutbox(window.localStorage, userId, clientId)`; entries with `lastError` also get a "retry" `Button` calling `retryOutboxEntry(window.localStorage, userId, clientId)` (Ruling R6 — clears the error so the next sync picks the entry up again).

- [ ] **Step 3: Wire into `DreamsList`** — render `<PendingDreamList dateIso={…} />` above `<DreamList …/>`. Add the no-cache offline guard so a never-cached day doesn't crash on `undefined` data (offline, a paused query returns `undefined` without suspending, and the destructuring would throw into the error boundary):

```tsx
const online = useOnlineStatus()
const params = { orderBy: …, skip: 0, take: ITEMS_PER_PAGE, …where } // existing object, hoisted
const hasCached = !!getQueryClient().getQueryData(queryKeyFor(getDreams, params))
const [data, { isLoading, refetch }] = usePaginatedQuery(getDreams, params, {
  enabled: online || hasCached,
})
if (!data)
  return (
    <>
      <PendingDreamList dateIso={dateIso} />
      <Alert severity="info">you're offline and this day isn't cached on this device yet</Alert>
    </>
  )
```

(`enabled: false` with no data returns `undefined` without suspending — hook order stays stable.)

- [ ] **Step 4: Calendar marks** — in `DreamsCalendar`, merge pending days into the query result before `renderDreamDay` (shape from `getDreamsByMonth`: `{ [isoDate]: { count, dreams: string[] } }`):

```tsx
const pending = usePendingDreams()
const merged = useMemo(() => {
  const result = { ...(dreamsByMonth ?? {}) }
  for (const entry of pending) {
    const iso = DateTime.fromISO(entry.values.dreamAt as string)
      .setZone(userTimezone)
      .toISODate()
    const existing = result[iso]
    result[iso] = {
      count: (existing?.count ?? 0) + 1,
      dreams: [...(existing?.dreams ?? []), "pending sync"],
    }
  }
  return result
}, [dreamsByMonth, pending])
```

and give `getDreamsByMonth` the same `enabled: online || hasCached` guard (calendar renders unmarked days from `merged` when `dreamsByMonth` is `undefined`).

- [ ] **Step 5: Offline sheep swap** — in `DreamsPage`, `const online = useOnlineStatus()` and swap the page sheep while offline (one-sheep-per-page convention — the page's sheep _becomes_ the offline sheep rather than adding a second image):

```tsx
import sheepOffline from "public/assets/sheep-offline.png" // maintainer-supplied, see Global Constraints
…
<Image src={online ? sheepDreams : sheepOffline} alt="dreams sheep" … />
```

- [ ] **Step 6: Verify empirically** — dev server: offline → add dream → appears instantly with the badge, day marked in calendar, page sheep swaps to the offline sheep; refresh (dev has no SW, so navigate client-side instead) → still listed; discard works. `npm run type:check` + `npm run lint`.

- [ ] **Step 7: Commit** (`feat(offline): pending dreams visible in list and calendar, offline sheep`).

---

### Task 7: App wiring — sync engine, hydration, banner (`<OfflineSupport />`)

**Files:**

- Create: `src/core/offline/OfflineSupport.tsx`
- Modify: `src/pages/_app.tsx`

**Interfaces:**

- Consumes: `useOnlineStatus`/`isBrowserOnline`/`registerServiceWorker` (Tasks 1, 4), `syncOutbox`/`SyncResult` (Task 2), `hydratePersistedQueries`/`subscribeQueryPersistence` (Task 3), `usePendingDreams` (Task 6), plus `rpcFetch`/`getQueryClient`/`invalidateQuery` from `src/core/rpc-client`, `useSession`/`readPublicDataFromCookie` from `src/auth/client`, `getDreams`/`getDreamsByMonth` from `src/dreams/client`.
- Produces: one component mounted once in `_app` (inside `QueryClientProvider`, outside `getLayout`) that owns all app-level offline behavior. No Layout changes needed.

> **Superseded during review (2026-09-28, Rulings R24/R25):** the fixed-top banner below covered the navbar (Menu unreachable at 320 px); the committed version renders the banner **in-flow** via `Layout` (`src/core/offline/OfflineBanner.tsx`, `authRequired` shared through `src/core/offline/syncStatus.ts`), keeps only the compact corner ribbon + snackbar in `OfflineSupport`, and `DreamsPage` gates the calendar/list on `router.isReady` (boot hydration exposed a latent month-jump bug).

- [ ] **Step 1: `OfflineSupport.tsx`** — a component rendering a fixed top banner + a sync snackbar, plus effects:

```tsx
// module-level: at most one sync run per tab, whatever re-renders happen …
let syncing = false

// … and at most one per BROWSER: the `online` event fires in every open tab at once, and two
// tabs replaying the same entry would create it twice. The Web Locks API (Chrome 69+,
// Firefox 96+, Safari 15.4+, no dependency) serialises them; `ifAvailable` makes the loser
// skip instead of queueing. Older browsers fall back to the per-tab guard. (Ruling R7)
async function runSync(userId: number, onResult: (result: SyncResult) => void): Promise<void> {
  if (syncing) return
  syncing = true
  const run = async () => {
    const result = await syncOutbox(window.localStorage, userId, (values) =>
      rpcFetch("createDream", values)
    )
    onResult(result)
  }
  try {
    if (navigator.locks) {
      await navigator.locks.request(`ds.outbox.sync.${userId}`, { ifAvailable: true }, (lock) =>
        lock ? run() : Promise.resolve()
      )
    } else {
      await run()
    }
  } finally {
    syncing = false
  }
}

export default function OfflineSupport() {
  const online = useOnlineStatus()
  const session = useSession()
  const pending = usePendingDreams()
  const [syncedCount, setSyncedCount] = useState(0)
  const [authRequired, setAuthRequired] = useState(false)

  // boot per login: SW registration + query-cache hydration + persistence subscription.
  // The userId is read from the cookie (`readPublicDataFromCookie` from src/auth/client, as
  // AuthGuard does), NOT from useSession(): during React's hydration pass the store still
  // reports the empty server snapshot, and an effect keyed on it would hydrate one render
  // too late — after AuthGuard has mounted the page body, which then suspends on a paused
  // query for good on an offline cold start (Ruling R12). Never hydrate during render: it
  // would change the first client render vs. the SSR output.
  useEffect(() => {
    registerServiceWorker()
    const userId = (readPublicDataFromCookie().userId as number | undefined) ?? null
    if (!userId) return
    hydratePersistedQueries(window.localStorage, userId, getQueryClient())
    return subscribeQueryPersistence(window.localStorage, userId, getQueryClient())
  }, [session.userId])

  // sync on: coming online, app start, login (userId change), new queue entries. A `blocked`
  // result while online means the server, not the network, is unavailable (e.g. nginx's
  // maintenance page during a deploy) — the online event will not fire again by itself, so
  // retry once after a minute (Ruling R7)
  // the dependency is the number of SYNCABLE entries, not the queue length: the "retry" button
  // only clears an entry's lastError, and that must re-trigger a run (Ruling R10)
  const syncable = pending.filter((entry) => !entry.lastError).length
  useEffect(() => {
    if (!online || !session.userId || syncable === 0) return
    const userId = session.userId
    let retry: ReturnType<typeof setTimeout> | undefined
    const handle = (result: SyncResult) => {
      setAuthRequired(result.authRequired)
      if (result.synced > 0) {
        void invalidateQuery(getDreams)
        void invalidateQuery(getDreamsByMonth)
        setSyncedCount(result.synced)
      }
      if (result.blocked && isBrowserOnline()) {
        retry = setTimeout(() => void runSync(userId, handle), 60_000)
      }
    }
    void runSync(userId, handle)
    return () => clearTimeout(retry)
  }, [online, session.userId, syncable])

  return <>{/* banner, ribbon and snackbar markup below */}</>
}
```

Snackbar (same pattern as Task 5): `open={syncedCount > 0}`, `onClose={() => setSyncedCount(0)}`, `autoHideDuration={6000}`, message `` `${syncedCount} dream${syncedCount > 1 ? "s" : ""} made it home 🐑` ``.

Banner markup (offline, or online-with-auth-needed):

```tsx
{
  ;(!online || (authRequired && pending.length > 0)) && (
    <Alert severity="info" className="fixed top-0 inset-x-0 z-1400 rounded-none justify-center">
      {!online
        ? pending.length > 0
          ? `you're offline — ${pending.length} dream${
              pending.length > 1 ? "s" : ""
            } tucked away, they'll sync when you're back`
          : "you're offline — dreams you add are saved on this device until you're back"
        : `please log in again to sync ${pending.length} pending dream${
            pending.length > 1 ? "s" : ""
          }`}
    </Alert>
  )
}
```

- [ ] **Step 2: Offline corner ribbon** — also rendered by `OfflineSupport` when `!online`: a CSS-only 45° ribbon pinned over the top-right edge of the navbar, mobile and desktop (a constant cue even when the alert is missed). No images, no layout shift:

```tsx
{
  !online && (
    <div
      aria-hidden="true"
      className="fixed top-0 right-0 z-1400 w-24 h-24 overflow-hidden pointer-events-none"
    >
      <span className="absolute block w-36 text-center rotate-45 top-6 -right-9 bg-mui-warning-main text-white text-xs font-bold uppercase tracking-widest py-1 shadow-md">
        offline
      </span>
    </div>
  )
}
```

(`bg-mui-warning-main` assuming the theme-color utilities from the Tailwind v4 migration — use whatever `bg-mui-*` token the codebase already exposes, else a literal `bg-[#ff9800]`. Check it doesn't collide with the MUI AppBar's own z-index and that the sr experience is covered by the banner Alert, hence `aria-hidden`.)

- [ ] **Step 3: Mount in `_app.tsx`** — inside `<AppErrorBoundary>` next to `CreateInstantSymbolProvider`'s children: `<OfflineSupport />` before `{getLayout(…)}`. (It must sit inside `QueryClientProvider`; it renders `null`-ish chrome only, so placing it outside `getLayout` keeps it identical on every page.)

- [ ] **Step 4: Verify empirically** — dev server: queue 2 dreams offline → go online → snackbar "2 dreams made it home", list/calendar refresh, outbox empty, dreams in DB (check the list after reload). Banner + corner ribbon show/hide with DevTools offline toggle, ribbon sits over the navbar's top-right edge at 320px and desktop widths.

- [ ] **Step 5: Commit** (`feat(offline): app-level sync engine, hydration, banner and ribbon`).

---

### Task 8: Settings/Stats/Search offline notices + RootErrorFallback offline branch

**Files:**

- Modify: `src/pages/settings/index.tsx`
- Modify: `src/pages/stats/index.tsx`
- Modify: `src/pages/search/index.tsx`
- Modify: `src/pages/_app.tsx` (`RootErrorFallback`)

**Interfaces:**

- Consumes: `useOnlineStatus`, `isBrowserOnline` (Task 1). `getUser` is already in `PERSISTED_QUERY_KEYS` (Task 3), so a previously visited Settings page renders read-only from cache.

> **Extended during review (2026-09-28, Rulings R28/R29):** `src/users/components/UpdateUserForm.tsx` also changes — it renders `<ExportDreams/>` only online (its two unpersisted queries crashed an offline cold start) and wraps the card stack in a disabled `fieldset` while offline (the spec's "export/password/delete disabled offline"; a paused mutation would otherwise fire on reconnect and `router.reload()`). The `_app.tsx` offline branch is built on the AuthenticationError branch's layout (one centered offline sheep), not `CustomErrorContainer` (which always renders the error sheep). Stats' always-mounted `DreamDatePicker` and Search's page-level `getSymbols` also needed guards.

- [ ] **Step 1: Settings notice** — in the `Settings` component, `const online = useOnlineStatus()`; above the settings grid:

```tsx
{
  !online && (
    <Alert severity="info" className="mb-4">
      settings aren't available offline — reconnect to change anything here
    </Alert>
  )
}
```

and guard the `getUser` query with `enabled: !!session.userId && (online || hasCached)` (same `getQueryData` pattern as Task 6) + `if (!user) return` the same Alert alone, so a never-cached offline visit doesn't hang. Swap the page sheep while offline, exactly like Task 6 Step 5: `<Image src={online ? sheepSettings : sheepOffline} … />` (import `sheepOffline from "public/assets/sheep-offline.png"`).

- [ ] **Step 2: Stats + Search notices (maintainer's call, 2026-09-27: same treatment as Settings)** — in each page component, after its existing hooks (so hook order stays stable), replace the query-driven content with the notice while offline; the page chrome (sheep, title, layout) stays rendered:

```tsx
const online = useOnlineStatus()
```

and around the content that fires queries (`StaticStatsCharts`/`AdvancedStats`/`SleepChart` on stats; `SearchList` + `DreamSearchForm` results on search):

```tsx
{
  online ? (
    <Suspense fallback={<LoadingSpiral />}>{/* existing content, unchanged */}</Suspense>
  ) : (
    <Alert severity="info">
      stats aren't available offline — your dreams are safe, the charts need the mothership
    </Alert>
  )
}
```

(same shape on search with its own copy: "search isn't available offline"). Because the query-firing children simply don't mount offline, no `enabled` guards are needed on these two pages, and going offline mid-view swaps content for the notice on the next render. Both pages also get the offline sheep swap on their page sheep import, same ternary as Task 6 Step 5.

- [ ] **Step 3: `RootErrorFallback` offline branch** — in `_app.tsx`, before the generic branch:

```tsx
if (error instanceof TypeError && !isBrowserOnline()) {
  return (
    <Layout>
      <CustomErrorContainer>
        <Image
          src={sheepOffline}
          alt="offline sheep"
          width={192}
          height={192}
          className="w-1/3 max-w-48 h-auto mx-auto"
        />
        <Alert severity="info" className="mb-4">
          this page needs a connection — your dreams are safe on this device
        </Alert>
        <Button variant="contained" onClick={resetErrorBoundary}>
          try again
        </Button>
      </CustomErrorContainer>
    </Layout>
  )
}
```

(`_app.tsx` already imports `Image`; add `import sheepOffline from "public/assets/sheep-offline.png"` next to the existing `sheepSignup` import.)

- [ ] **Step 4: Verify empirically** — offline: visit Settings (previously visited → read-only + notice; also confirm no hang after clearing localStorage); visit Stats and Search → chrome renders, notice in place of charts/results, every page sheep swapped to the offline sheep, back online → content and sheep return. Force the error branch by blocking `/api/rpc/*` in DevTools while "online" is unchecked.

- [ ] **Step 5: Commit** (`feat(offline): settings/stats/search notices and offline error-boundary branch`).

---

### Task 9: Logout purge (privacy)

**Files:**

- Modify: `src/core/layouts/Header.tsx` (logout handler, ~line 74)

**Interfaces:**

- Consumes: `clearOutbox` (Task 2), `clearPersistedQueries` (Task 3), the SW `"ds-logout"` message (Task 4), `getQueryClient` from `src/core/rpc-client` (Ruling R13: `.clear()` the in-memory cache on logout).

> **Extended during review (2026-09-28, Rulings R31/R32):** before `logoutMutation()`, when online and the outbox is non-empty, the handler runs a best-effort `syncNow(userId)` so a logout never silently discards dreams written offline. `syncNow` lives in `src/dreams/offline/syncRunner.ts` together with the engine's `runSync` (moved out of `OfflineSupport`), so both paths share one Web Lock and one in-tab guard — a direct `syncOutbox` call from the header duplicated a dream when it overlapped the engine's run.

- [ ] **Step 1: Implement** — in the logout handler, capture `const userId = session.userId` **before** awaiting the mutation, then after it, in this order (Ruling R13):

```tsx
// query keys carry no userId and the QueryClient is a module singleton: without this,
// user A's cached dreams would sit in memory for user B and get persisted under B's key
getQueryClient().clear()
if (userId) {
  clearOutbox(window.localStorage, userId)
  clearPersistedQueries(window.localStorage, userId)
}
navigator.serviceWorker?.controller?.postMessage("ds-logout")
```

(`getQueryClient` from `src/core/rpc-client`. A persistence debounce timer that fires after the purge can only write an empty snapshot, which `persistQueries` turns into `removeItem`.)

Note in a comment: logging out with a non-empty outbox drops those dreams — acceptable v1; the confirm-dialog nicety is listed as follow-up in the PR.

- [ ] **Step 2: Verify empirically** — queue a dream offline, go online but log out before sync completes… actually: log in, cache queries, log out → both `ds.*` keys gone from localStorage.

- [ ] **Step 3: Commit** (`feat(offline): purge device caches on logout`).

---

### Task 10: Symbols offline — the dream form's pickers must never crash; symbols page guarded

> **Scope raised during review (2026-09-28, Rulings R27/R30):** originally a skippable stretch. Task 8's cold-start verification showed that `SymbolsRadioList` (shared by the New-dream form and Settings) and `SymbolsAutocomplete` destructure query results that are not persisted — an offline cold start followed by "New dream" would crash into the error boundary, breaking the critical path. `/symbols` crashes offline the same way (`SymbolsList`, `SymbolJumpAutocomplete`).

> Corrected 2026-09-28 (review of Task 8): `SymbolsRadioList`'s only consumer is Settings' `UpdateUserForm`, whose call site is already gated online — so it and `getSymbolsWithoutDreams` are NOT part of this task. The dream form's risk is `SymbolsAutocomplete`.

**Files:**

- Modify: `src/dreams/components/SymbolsAutocomplete.tsx` (`const [{ symbols }] = useQuery(…)` → guard + `symbolsResult?.symbols ?? []`; hide the freeSolo "create …" option while offline — creating a symbol needs the server)
- Modify: `src/symbols/components/SymbolsList.tsx`, `src/symbols/components/SymbolJumpAutocomplete.tsx` (same guard; when offline with nothing cached render an info `Alert` "symbols aren't cached on this device yet" in place of the list)

**Interfaces:**

- Consumes: `useOnlineStatus`/`isBrowserOnline` (Task 1), `getQueryClient`/`queryKeyFor` (rpc-client), the persisted allowlist (Task 3). Selected symbols embed their real ids into the queued payload — valid at replay.

- [ ] **Step 1:** Guard `SymbolsAutocomplete` with the `enabled: online || hasCached` + nullish-fallback pattern (hook order stable — hooks before any early return); hide the instant-create option offline.

- [ ] **Step 2:** Guard the symbols page components the same way, with the notice when offline and uncached.

- [ ] **Step 3: Verify empirically (production build — cold start needs the worker)** — visit `/dreams` online once (persists the pickers' queries), go offline, `page.reload()`, "New dream" → the form opens, both pickers render from cache, attach a built-in and an own symbol, queue; clear `localStorage`, reload offline again → "New dream" still opens with EMPTY pickers (no crash); online → the queued dream syncs with both symbols. `/symbols` offline: list from cache, or the notice; never the error page. Confirm no "create …" option offline.

- [ ] **Step 4: Commit** (`feat(offline): symbol pickers and symbols page never crash offline, create stays online-only`).

**Agreed fallback if this task fights back:** hide the symbols field entirely while offline — text + toggles are the contract (maintainer's call, 2026-09-27).

---

### Task 11: E2E + manual production verification

**Files:**

- Create: `test/e2e/offline.e2e.test.ts` (plumbing from `test/e2e/helpers.ts`)

- [ ] **Step 1: Write the e2e** (dev server has no SW, so this covers outbox/sync, not shell caching — and in Next DEV mode cross-route client navigation while offline is impossible regardless of this feature because page chunks are fetched on navigation, so every offline step stays on `/dreams`; same-route `?date=` pushes are fine): login as zhuangzi → `page.setOfflineMode(true)` → assert the in-flow banner text and the corner ribbon → add dream "offline e2e dream" → assert the pending card with "waiting to sync" and the calendar mark → navigate to another day and back via the calendar/sheep (same route; data survives) → `page.setOfflineMode(false)` → wait for the "made it home" snackbar → assert the dream renders as a normal entry and `localStorage["ds.outbox.<id>"]` is empty/absent → delete it (existing deletion-dialog helper) → also assert `localStorage["ds.queries.<id>"]` exists after the online visit (persistence). Reuse the puppeteer scripts the implementers of Tasks 5–10 wrote (their reports under `.superpowers/sdd/2026-09-27-offline-pwa/` describe the selectors that worked); keep one deterministic file, no timing sleeps where a selector wait will do.

- [ ] **Step 2: Run** `npm run test:e2e -- offline` against a running seeded dev server. Expected: PASS.

- [ ] **Step 3: Manual production-build check (the part e2e can't see)** — `yarn build && yarn start` + seeded DB: login, visit /dreams, DevTools → offline → **hard refresh** → shell renders with banner (not the browser error page); enter a dream; refresh again; still pending; online → syncs. Open a never-visited blog post offline → HTML renders, cover shows the offline sheep (gray SVG if the asset hasn't landed); /blog index works. Also: cold-start the installed app offline on a real phone if available. Record results in the PR description.

- [ ] **Step 4: Visual tests** — baseline on unchanged `main` first (`test/visual/README.md`), then add offline-banner and pending-card states if worth pinning; re-baseline only the named new shots.

- [ ] **Step 5: Commit** (`test(offline): e2e outbox round-trip and manual verification notes`).

---

### Task 12: Announcement blog post ("Use case four: Dreaming offline")

**Files:**

- Create: `src/pages/blog/use-case-four-dreaming-offline/index.tsx`
- Create: `src/pages/blog/use-case-four-dreaming-offline/data.md`
- Create: `public/assets/blog-dreaming-offline.jpg` (PLACEHOLDER cover — grayscale copy of the A2HS cover; maintainer replaces)
- Modify: `src/routes.ts` (add `ArticlePageUseCaseFourDreamingOffline` — `src/routes.test.ts` fails on orphan pages otherwise)
- Modify: `public/sitemap.xml` (add the new URL)
- Modify: `src/pages/blog/use-case-two-add-to-home-screen/data.md` (`related:` — new slug first) and `index.tsx` (its "(for this, you need to be online)" parenthetical is now outdated → link to the new post)

**Interfaces:**

- Consumes: the blog page skeleton of `src/pages/blog/use-case-two-add-to-home-screen/index.tsx` (copy it verbatim and replace content), `getRelatedBlogs` from `src/pages/api/blog/get-blogs.ts`, `Routes` from `src/routes.ts`.
- Produces: a prerendered article at `/blog/use-case-four-dreaming-offline`, listed on `/blog` via its `data.md` frontmatter. **All copy is a DRAFT in the house voice for the maintainer's rewrite** — say so in the PR.

- [ ] **Step 1: Placeholder cover** — `node -e "require('sharp')('public/assets/blog-add-to-home-screen.jpg').grayscale().jpeg({ quality: 80 }).toFile('public/assets/blog-dreaming-offline.jpg').then(() => console.log('ok'))"`.

- [ ] **Step 2: `data.md`** (frontmatter shape from the existing posts — note the trailing period in `date`; the body is the index-card excerpt):

```md
---
title: "Use case four: Dreaming offline"
date: "Sun Sep 27 2026."
imageUrl: "/assets/blog-dreaming-offline.jpg"
related:
  - "use-case-two-add-to-home-screen"
  - "use-case-three-off-the-charts"
---

Remember the parentheses in use case two — "(for this, you need to be online)"?
Consider them removed. dreamingsheep now works offline: open the app without a
signal, land on your journal instead of a sad browser dinosaur, write the dream
down and go back to sleep. It waits on your device and finds its way home...
```

(`date` is a PLACEHOLDER — the maintainer sets the real release date.)

- [ ] **Step 3: `index.tsx`** — copy `use-case-two-add-to-home-screen/index.tsx`, rename the component to `ArticlePageUseCaseFourDreamingOffline`, swap the cover import to `blogDreamingOffline from "public/assets/blog-dreaming-offline.jpg"`, title/subheader/Layout `title`/`description` and `getRelatedBlogs("use-case-four-dreaming-offline")`. Replace the `CardContent` body (after the cover `Image`) with this draft — keep the `&#32;` rule for any text node with an entity that follows a tag:

```tsx
<Typography variant="body1" className="mb-4">
  Remember{" "}
  <Link href={Routes.ArticlePageUseCaseTwoAddToHomeScreen()} passHref={true}>
    use case two
  </Link>
  ? Phone by the pillow, airplane mode, a few keywords scribbled at 3 a.m. There was a catch
  hiding in the parentheses: <em>(for this, you need to be online)</em>. Consider the
  parentheses removed. <em>dreamingsheep</em>&#32;now works offline: open the app without a
  signal, land on your journal instead of a sad browser dinosaur, write the dream down and go
  back to sleep. The dream waits on your device and quietly finds its way home the next time
  you are connected — in ten minutes, or after a week in the mountains.
</Typography>
<Typography variant="body1" className="mb-4">
  No cloud magic involved{" "}
  <span className="lucidicon lucidicon-smiley-smiley"></span>. Dreams written offline sit in
  your browser&apos;s storage, marked <em>waiting to sync</em>&#32;with a little hourglass, one
  per morning if that is how the week goes. When the connection returns they are sent in the
  order you dreamt them. Nothing is ever overwritten: offline you can only <em>add</em>&#32;dreams,
  never edit old ones — so if you also logged one from your laptop in the meantime, both simply
  end up in the journal. Delete the twin if you managed to dream the same dream twice.
</Typography>
<Typography variant="body1" className="mb-4">What works without a signal:</Typography>
<ul>
  <li>the journal — your recent days, the calendar, and a brand new dream;</li>
  <li>attaching the symbols you already have (new ones need the mothership);</li>
  <li>the FAQ and this entire blog, cover images optional.</li>
</ul>
<Typography variant="body1" className="mb-4">
  Stats, search and settings still need the real database and will politely say so. An
  <em>offline</em>&#32;ribbon in the corner and a banner tell you which world you are in — and
  the offline sheep will keep you company on every page. [MAINTAINER: a line about the
  offline sheep once it is drawn]
</Typography>
<Typography variant="body1" className="mb-4">
  The fine print: the very first visit in a browser has to happen online (that is when the
  app packs its offline bag), private windows forget everything, and phones — iPhones in
  particular — may spring-clean an app that has not been opened for about a week, so on a
  long trip do open it now and then. Your dreams are only ever on your device until they
  sync; nothing new is collected, as the{" "}
  <Link href={Routes.PrivacyPolicyPage()} passHref={true}>
    Privacy policy
  </Link>
  &#32;still promises.
</Typography>
<Typography variant="body1">
  Happy offline dreaming — and if your dreams turn out to have no signal in the mountains
  either, well, that is rather the point. Long time no sleep!{" "}
  <span className="lucidicon lucidicon-device"></span>
</Typography>
```

- [ ] **Step 4: Routes, sitemap, cross-links** — `src/routes.ts`: `ArticlePageUseCaseFourDreamingOffline: route("/blog/use-case-four-dreaming-offline"),` in alphabetical position; `public/sitemap.xml`: a `<url>` block for `https://dreamingsheep.net/blog/use-case-four-dreaming-offline` mirroring the neighbours; A2HS `data.md` `related:` gets `"use-case-four-dreaming-offline"` as its first entry; in the A2HS `index.tsx`, change `(for this, you need to be online)` to `(for this, you used to need to be online — not anymore, see{" "}<Link href={Routes.ArticlePageUseCaseFourDreamingOffline()} passHref={true}>use case four</Link>)`.

- [ ] **Step 5: Verify** — `npm test` (routes test passes with the new page), `npm run lint`, `npm run type:check`, `npm run build` (the article prerenders; `sw-precache.json` now lists 13 posts). Dev server: `/blog` shows the card first (newest date), the article renders, "More from the blog" shows two related posts, the A2HS post links forward.

- [ ] **Step 6: Commit** (`feat(blog): announce offline mode (draft copy, placeholder cover)`) — stage by explicit path.

---

## Not in this plan (explicitly)

- Offline edit/delete of synced dreams; Background Sync API; web push.
- `clientId String? @unique` migration for idempotent replay — revisit only if a duplicate ever appears (Open decision #1 in the spec).
- All user-facing copy above is placeholder for the maintainer's voice pass.
