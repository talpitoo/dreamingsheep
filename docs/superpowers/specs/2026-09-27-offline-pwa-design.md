# Offline support for the installed app ("Add to home screen") — design

**Status: implemented on branch `offline-pwa` (2026-09-27/28) — awaiting the maintainer's PR review.** Rulings made during implementation review are recorded in the plan; placeholders (offline sheep drawing, blog cover, copy, post date) are the maintainer's.

## Goal

A logged-in user who installed dreamingsheep on their home screen can open the app
offline, land on `/dreams` (not a browser error page), enter dreams — text fields and
the toggle-button options at minimum — and have them saved locally and synced to the
DB when connectivity returns, even days later (the "hiking trip" scenario: log in on
wifi, spend days offline entering dreams, reconnect, everything lands in Postgres).

**Scope note (2026-09-27):** although "Add to home screen" is the flagship scenario,
service workers are registered per browser + origin, not per install mode — so every
behavior below (cached shell on refresh, outbox, banner, offline sheep) applies
identically to regular browser tabs on desktop/laptop. The only constraints are that
a browser's first-ever visit must happen online (the worker installs then), and
private/incognito windows don't keep the caches. Today's offline behavior is the
browser's own network-error page (not a 404 — no server is reachable to send one).

Priorities from the maintainer:

1. **Critical:** `/dreams` — entering dreams offline, preserving them, syncing on
   reconnect; surviving a refresh while offline.
2. **Nice-to-have:** symbols (browsing, attaching existing ones to a dream), FAQ and
   a few recent blog posts readable offline.
3. **Settings:** a page-level "not available offline" notice is enough.
4. **Fallback philosophy:** never a 404/dead-end offline page — pages stay rendered
   with offline notifications, like well-behaved apps do.
5. If full symbol support offline is too much: preserving the text entries and the
   toggle-button dream options (type/time/recall/mood/favorite) is enough. Symbol
   attachment is a stretch goal, not a requirement.

## Constraints

- **Frozen dependencies** (root CLAUDE.md): no `next-pwa`, no workbox, no
  `@tanstack/react-query-persist-client`. Everything hand-rolled, small, and
  unit-tested, in the spirit of the owned core (`src/core/`, ~900 lines).
  `usehooks-ts` (already pinned) provides `useLocalStorage`/`useEventListener`;
  `uuid` is already pinned too.
- **Privacy-first**: dreams cached on-device must be purged on logout; caches keyed
  by userId so two accounts on one device never see each other's data.
- **No backend additions unless unavoidable** (maintainer is frontend-focused). The
  design needs zero schema changes in v1; one optional hardening migration is listed
  under Open decisions.

## What happens offline today (investigated 2026-09-27)

- **Manifest is done**: `public/manifest.json` is complete (standalone, icons,
  `start_url: "/"`), linked from `_document.tsx`. A2HS itself works. There is **no
  service worker** and no offline handling anywhere in `src/`.
- **Refresh / cold start of the installed app while offline** → the browser's native
  "No internet" error page. In standalone display mode this is a bare white error
  screen with no browser chrome to escape from. This is the single worst current
  behavior.
- **App already open, then goes offline (airplane mode)** → react-query v4's default
  `networkMode: "online"` _pauses_ new fetches when `navigator.onLine` is false. A paused
  query with no cached data does **not** suspend (`fetchStatus: "paused"`, `isFetching`
  false) — it renders with `data: undefined`, so any component that destructures a query
  result (the dreams list, the calendar) throws a `TypeError` into the root error
  boundary: the error-sheep page again, with no way back until online. Queries that
  already hold data keep showing it. (Corrected 2026-09-27 during implementation review.)
- **Flaky network** (`navigator.onLine` true but fetch fails) → the `TypeError` from
  `rpcFetch` bubbles past Suspense to `RootErrorFallback` in `_app.tsx` and the whole
  page is replaced by the error-sheep page — the same mechanism as the Googlebot 499
  incident. "Failed to fetch" as the title, no way back without network.
- **Entering a dream offline** → the paused mutation's `mutateAsync` promise never
  settles; the Add button shows the hourglass forever; a refresh loses the text.
- **What already works for us:**
  - Auth state is readable offline: `AuthGuard` and `useSession` decode the
    `PUBLIC_DATA` cookie directly, no network. Sessions last **30 days sliding**
    (`SESSION_TTL_MS`, refreshed when < 15 days remain), so "logged in on wifi,
    offline for a week" keeps a valid session for the sync.
  - Private pages SSR as **static shells** — server-side query data is `undefined`
    by design, so their HTML contains zero private data and is safe to cache in a
    service worker.
  - The anti-CSRF token is a readable cookie fetched at request time
    (`readCookieValue(COOKIE_CSRF)`), so queued mutations replayed later
    automatically use whatever token is current — including after a re-login.
  - `/api/rpc/*` is POST-only, so a GET-only service worker can never accidentally
    cache RPC responses.

## Design overview

Four pieces, deliberately separable:

```
A. Service worker            — the shell survives refresh/cold start offline
B. Offline-aware data layer  — cached query data + online status, pages render instead of hanging
C. Dream outbox + sync       — offline entries persisted locally, replayed on reconnect
D. Page-level UX             — global banner, settings notice, nice-to-have precaching
```

A alone fixes the refresh; A+B makes pages render offline; A+B+C delivers the
critical scenario; D is polish. They ship in that order and each is useful without
the ones after it.

### A. Service worker (`public/sw.js`, hand-written)

- **GET-only**; requests to `/api/*` are never intercepted (belt-and-braces on top of
  RPC being POST). No third-party requests (analytics, S3 images) are cached.
- **`/_next/static/*`**: cache-first (immutable content hashes).
- **Navigations** (`request.mode === "navigate"`): network-first. If a cached copy of
  that pathname exists (pages are keyed by pathname, so `/dreams?date=…` shares the
  `/dreams` shell), the network gets 4 s before the cached copy is served — but the
  request is never aborted: slow is not offline, and the late response still refreshes
  the cache. With no cached copy the worker waits for the network and serves the
  precached `/dreams` shell only when the fetch actually fails — never a dead-end
  offline page. Successful navigations are cached as they happen, so "pages you've
  visited keep working". `/` itself is never precached: for logged-in visitors it is a
  307 to `/dreams`, and a redirected response handed to a navigation is a browser
  network error (found in review, 2026-09-27). Next's per-page data
  (`/_next/data/*.json`, sent `no-store`) is passed through untouched, like `/api/`.
- **Two page caches**: `ds-precache-v1` holds the install-time shells (`/dreams`, FAQ,
  blog index, every post) plus the offline sheep and **survives logout**; `ds-pages-v1`
  holds runtime-cached navigations and is wiped on logout.
- **Same-origin images/fonts** (`/assets/*`, `/fonts/*`, manifest):
  stale-while-revalidate with a modest entry cap. **Images are never precached in
  bulk** — `public/assets` is 37MB, well past iOS's comfortable per-origin quota —
  only what the user actually viewed gets cached. The page sheep/title images are
  static imports served as content-hashed `/_next/static/media/*` files, so the
  dreams sheep caches itself (cache-first) on the first online visit; no special
  handling needed. **Offline, an uncached image gets the offline sheep** (see D)
  served from the worker's precache — gray inline-SVG placeholder until that asset
  exists — instead of a broken image. This is what lets every blog post's HTML be
  available offline without paying for its cover image (maintainer's call,
  2026-09-27).
- **Versioned caches**: cache names include the Next.js build id (injected by a tiny
  build step or read from `/_next/static/…` URLs); `activate` deletes old caches.
  Deploy-while-user-offline keeps working from the old cache; the next online
  navigation is network-first and picks up the new build.
- **Registration** in `_app.tsx` (`useEffect`, production only; handles the case where
  `load` already fired before the post-hydration effect). Alongside it,
  `navigator.storage.persist()` is requested to resist storage eviction on multi-day
  trips — **only in standalone display mode** (the installed app), because Firefox
  answers it with a permission prompt on plain websites and nagging is not the house
  style; Chromium grants it silently to installed PWAs, iOS ignores it.
- `next.config.js` gains a `headers()` entry serving `/sw.js` with
  `Cache-Control: no-cache` so updates are picked up promptly. No new dependency.

### B. Offline-aware data layer (`src/core/offline/`)

- **`useOnlineStatus()`**: `navigator.onLine` + `online`/`offline` events (via the
  already-pinned `usehooks-ts` primitives or a 20-line hook). Drives every offline
  notice.
- **Query persistence, allowlisted**: a small module subscribed to the query cache
  persists an explicit allowlist of query keys to `localStorage`
  (superjson-serialized so Dates survive), keyed by userId:
  `getCurrentUser`, `getDreams`, `getDreamsByMonth`, `getSymbols`.
  On boot it rehydrates via `queryClient.setQueryData` with a stale `updatedAt`, so
  react-query serves the cached data instantly and refetches the moment the app is
  online. Offline, suspense never triggers because data already exists — pages
  render last-known data instead of hanging. This is ~100 lines in the owned core,
  unit-tested, instead of two new @tanstack packages.
- **Failure semantics**: with `networkMode: "online"` kept as-is, a clean offline
  state pauses refetches (good — stale data stays on screen). For the flaky-network
  case, `RootErrorFallback` gets one new branch: a network `TypeError` while
  `!navigator.onLine`-ish renders the current page's layout with an offline alert
  and a retry button instead of the error sheep.
- **Privacy**: `logout` clears everything this feature stores (persisted queries,
  outbox, the worker's runtime page cache via a `postMessage`) and the in-memory
  react-query cache (query keys carry no userId, so user A's dreams would otherwise
  linger for user B on a shared device). Cache keys embed the userId. Because a
  purge would silently discard dreams written offline, the logout first runs a
  best-effort sync of the outbox when online — through the same lock-guarded runner
  the sync engine uses (implementation review, 2026-09-28); an offline logout still
  purges (privacy first), a confirmation dialog is a follow-up.

### C. Dream outbox + sync (`src/dreams/offline/outbox.ts`)

The heart of the critical scenario.

- **Data shape**: a `localStorage` queue (superjson) of
  `{ clientId: uuid, userId, values: CreateDream, queuedAt: Date }`. Dream text is
  small; localStorage limits (~5MB) are a non-issue. Each entry carries its own
  `dreamAt`, computed client-side with luxon exactly as the online path does — so a
  hiker can flip the (cached) calendar to each morning and file multiple days'
  dreams; they queue up independently.
- **Submit path** on `/dreams`: `onSubmit` checks `useOnlineStatus` first — offline,
  the values go straight to the outbox (no mutation call, no dangling promise), the
  form resets/closes exactly like a successful save, and a snackbar (reuse the
  `SleepingTimeForm` Snackbar pattern) says it's saved locally and will sync. If the
  mutation is attempted and fails with a network `TypeError` (flaky case), the catch
  falls back to the same outbox path instead of `FORM_ERROR`.
- **Pending dreams are visible**: outbox entries for the viewed day render in
  `DreamList` above the synced ones with a "waiting to sync" badge (hourglass icon —
  `lucidicon` if one fits), and their days get marked in the calendar. Refresh
  offline → shell from SW (A) → cached queries (B) → outbox entries still listed.
  Nothing is ever only-in-React-state.
- **Sync engine**: on `online` event, on app start, and after login, replay the
  queue in order through `rpcFetch("createDream", …)`; on success remove the entry
  and `invalidateQuery(getDreams/getDreamsByMonth)`; snackbar "N dreams synced".
  Failures: network error → stop, retry next trigger; `AuthenticationError` (session
  expired past 30 days) → keep the queue and show "log in to sync your N pending
  dreams" — after login the CSRF cookie has rotated but `rpcFetch` reads it fresh,
  so replay just works; validation error → mark the entry failed and surface it for
  editing rather than silently dropping it (should be near-impossible since the same
  zod schema validated it at entry time).
- **Multi-device concurrency — why there are no conflicts to resolve**: browsers/PWAs
  have no built-in sync conflict handling; you avoid conflicts by design. This design
  is **append-only**: offline you can only _create_ dreams, and a dream is not keyed
  by day or title (several dreams per day are already normal). So if the phone sits
  offline while the same user logs a dream from an online laptop — same day, even the
  same title — the phone's queued dreams simply insert as additional rows on
  reconnect. Nothing is overwritten, no "which device wins" priority is needed.
  Worst case is a human-made duplicate (same dream typed on both devices), which the
  user deletes by hand. Genuine conflicts only arise with offline **editing/deleting**
  of already-synced dreams (two devices changing the same row), which is exactly why
  that is out of scope for v1.
- **Symbols in offline entries** (stretch, cheap): `getSymbols` is in the persisted
  allowlist, so `SymbolsAutocomplete`/`SymbolsRadioList` render from cache and
  attaching **existing** built-in/own symbols embeds their ids in the queued payload
  — valid at replay time. Creating an instant symbol needs the server, so
  `CreateInstantSymbol` is disabled offline with a hint. If any of this misbehaves,
  the agreed fallback is: hide the symbols field offline; text + toggles are the
  contract.

### D. Page-level UX

- **Global offline banner**: a slim `Alert` rendered **in-flow by `Layout` right
  under the header** when offline (a fixed overlay covered the navbar — the mobile
  Menu button became unreachable; found in implementation review) — playful copy in
  the house voice (lowercase "i"). Shows the pending outbox count when non-zero, e.g.
  "you're offline — 2 dreams safely tucked away, they'll sync when you're back.
  Meh!", and, back online, "log in again to sync N pending dreams" when the session
  expired.
- **Offline corner ribbon**: in addition to the alert, a CSS-only 45° ribbon pinned
  over the top-right edge of the navbar (mobile and desktop) reading "offline" — a
  constant visual cue even after the alert scrolls away or is missed. Pure
  Tailwind (`fixed`, `rotate-45`, clipped corner), no images, no layout shift.
- **The offline sheep** (maintainer's idea, 2026-09-27): a new maintainer-drawn
  `public/assets/sheep-offline.png` — same style and `sheep-<page>.png` naming as the
  existing page sheep (their source files are 1300×1300 PNGs rendered at 384 CSS px; the
  interim placeholder is a 384×384 grayscale downscale) — becomes the face of every
  offline state.
  Pages showing an offline notice (dreams' uncached day, stats, search, settings)
  swap their own page sheep for it while offline (one ternary per page, keeping the
  one-sheep-per-page convention); the error boundary's offline branch shows it; and
  the service worker precaches it at install and serves it as the fallback for any
  uncached image, so even unvisited blog covers degrade to a sheep. Everything
  degrades gracefully (gray SVG / normal page sheep) until the asset lands, but the
  page-side static imports need the file to exist before those tasks build.
- **Settings**: `useOnlineStatus` → page-level `Alert` "settings aren't available
  offline"; the page stays rendered (read-only, from cached `getCurrentUser`).
  Export/password/delete actions disabled while offline.
- **FAQ + blog (nice-to-have)**: the SW precaches `/faq`, the blog index and **all**
  blog post URLs at install time from a `public/sw-precache.json` emitted at build
  time by a small script listing `src/pages/blog/*/` (~12 posts of prerendered HTML,
  well under 1MB total — cheap because cover images are _not_ precached; unvisited
  ones fall back to the gray placeholder above). Beyond that, any visited page keeps
  working via the navigation runtime cache.
- **Stats & search**: same treatment as Settings (maintainer's call, 2026-09-27) —
  the page stays rendered with a page-level "not available offline" `Alert` in place
  of the charts/results; no attempt to compute stats from cached data in v1.

## Explicitly out of scope

- Offline **editing/deleting** of already-synced dreams (conflict territory; creates
  are append-only and conflict-free — that's why the critical path is safe).
- Background Sync API (spotty support, iOS none) — sync triggers are the `online`
  event and app start, which cover the real scenario.
- Web push, periodic sync, App Router migration, any new dependency.

## Risks & platform caveats (honest notes)

- **iOS storage eviction**: Safari may purge SW caches _and_ localStorage after ~7
  days of the site/app not being used. Using the app daily on the trip (the actual
  scenario) keeps storage alive; a multi-week trip where the app is never opened
  could lose both shell and outbox. `navigator.storage.persist()` mitigates on
  Android only. Worth an honest line in the blog post that announces the feature.
- **Double-post window**: v1 removes an outbox entry after `createDream` succeeds; a
  crash in between could replay it once more. Tiny window, worst case a duplicate
  dream the user deletes. The proper fix is an optional `clientId String? @unique`
  on `Dream` + upsert-by-clientId — a migration, listed under Open decisions. The
  flaky-network fallback opens a second window of the same class: if the connection
  drops after the server saved the dream but before the response was read, the fetch
  `TypeError` sends the dream to the outbox and it is created again on sync (review
  note, 2026-09-27) — the same `clientId` fix would close both.
- **Session > 30 days stale**: sync blocks on re-login (handled, see C) — dreams are
  never lost, just waiting.
- **Shared device / multiple accounts**: all storage keyed by userId and purged on
  logout; outbox entries replay only when their `userId` matches the session.
- **SW + old HTML after deploys**: old build's chunks stay cache-first until
  `activate` cleanup, so a stale shell never 404s its own assets offline.

## Testing strategy

- **Unit (vitest)**: outbox module (enqueue/replay-order/dedupe/auth-failure paths,
  `vi.setSystemTime` for multi-day queues), persistence module (allowlist,
  userId-keying, purge-on-logout), online-status hook. sw.js kept as thin
  fetch-routing over pure, unit-testable helper functions where practical.
- **E2E (puppeteer, existing suite)**: `page.setOfflineMode(true)` is already
  available in puppeteer 17 — a new `offline.e2e.test.ts`: login → offline → enter
  dream → refresh → still listed as pending → online → synced to DB (assert via
  `getDreams`) → cleanup. Plus a settings-notice check.
- **Visual (playwright)**: offline banner and pending-badge states at the usual
  breakpoints, baselined per `test/visual/README.md` (baseline on `main` first).

## Open decisions for the maintainer

1. **`clientId` migration for idempotent sync** — recommend _not_ in v1 (zero
   backend changes), revisit if a duplicate ever shows up in the wild.
2. **Blog precache list**: build-step-generated JSON (as designed) vs. skipping it
   and relying on "visited pages stay available". The build step is ~30 lines but is
   one more moving part.
3. **Snackbar copy & banner wording** — maintainer's voice, best written by the
   maintainer.

## Maintainer feedback round (2026-10-03, after testing PR #42 locally)

- **Notifications stay until dismissed.** One notification slot (`src/core/offline/offlineNotice.ts`):
  "saved on this device — it syncs when you're back online" (the bedtime toast's night icon) and
  "N offline dreams synced" (MUI `Wifi` icon) replace each other and only close via their ×; the
  banner keeps counting pending dreams meanwhile. No emoji, no auto-hide.
- **Banner vs. the hanging logo.** The header's logo stays on top; the banner's content starts to
  its right (`pl-[150px]`, symmetric on md+) and carries the `WifiOff` icon. Ribbon text re-centered.
- **Offline pages = sheep + title + notice.** Stats and Settings render nothing else offline (no
  range/filter controls, no settings cards — a save would only pause and fire on reconnect); the
  `<div>` wrappers that let the page shrink to the notice's width are gone. Search likewise. The
  symbols page keeps the cached list read-only (no jump box / filter, no new/edit/delete).
- **No React-side sheep swap.** Pages show their own sheep; the worker serves the offline sheep
  only for images that are not cached. Offline, every content image gets `filter: grayscale(1)`
  (`html[data-offline] img`) — blog covers, the page sheep, the cookie monster.
- **Offline is read-only beyond adding dreams.** Dream and symbol cards hide edit/delete offline
  (an open edit closes); the bedtime/wake-up form renders disabled with cached values
  (`getSleepingTime` is persisted) so the day's layout is unchanged.
- **The maintainer's assets landed (2026-10-03):** `public/assets/sheep-offline.png` (the real
  offline sheep) and `public/assets/blog-offline.png`, a generic blog cover the worker serves for
  every uncached blog cover (file names starting with `blog-`, on article pages, the blog index
  and "more from the blog"); the announcement post uses it as its own cover and the grayscale
  placeholder cover is gone.
