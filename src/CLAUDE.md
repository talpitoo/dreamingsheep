# src/ — app architecture & conventions

Plain **Next.js 16 pages router** on Node 22 (Blitz removed 2026-08 — design in
[docs/superpowers/specs/2026-08-02-blitz-removal-design.md](../docs/superpowers/specs/2026-08-02-blitz-removal-design.md)).
Domain-driven layout: `src/<entity>/{queries,mutations,components,validations.ts}`.
Shared UI + the owned RPC/session core in `src/core/` and `src/auth/session/`.
See root [CLAUDE.md](../CLAUDE.md) for the frozen-deps policy.

## RPC pattern (owned core, Blitz-shaped)

- Queries/mutations are plain files served over `POST /api/rpc/<filename>` by
  `src/pages/api/rpc/[endpoint].ts`:
  `resolver.pipe(resolver.zod(Schema), resolver.authorize(), async (input, ctx) => …)`
  with `resolver` from `src/core/resolver`.
  **Every file in a `queries/`/`mutations/` folder is a public HTTP endpoint** —
  even a bare exported function; it must carry `resolver.authorize()` and do its
  own scoping, because client-supplied `where`/`id` inputs are attacker-controlled —
  **and it must be registered in `src/core/rpc-registry.ts`** (a unit test,
  `rpc-registry.test.ts`, fails the build-time suite if the two drift).
- **Every dream/symbol/sleepingTime query AND mutation is scoped to the
  logged-in user** — e.g. `getDreams` injects `where["userId"]`, `deleteDream`
  deletes `{ id, userId }`, `updateDream` checks ownership first. Symbols
  visibility rule: `builtIn: true` (shared, toggled per-user via `relatedTo`)
  OR `authorId = userId` (private creations); user symbols can never become
  built-in (`createSymbol`/`updateSymbol` force `builtIn: false`), and built-ins
  can never be edited/deleted via RPC. `getUsers` is ADMIN-only.
- The **only** legitimate cross-user aggregation is the public homepage's stats,
  computed server-side in `src/pages/index.tsx` `getServerSideProps` (counts +
  a raw SQL top-3 of built-in symbols) — **never pass dream rows as page props**;
  they end up serialized in the public HTML (see issue #11). The
  `test/e2e/isolation.e2e.test.ts` suite guards these rules with two users.
- Client side: `useQuery` / `usePaginatedQuery` / `useMutation` / `invalidateQuery`
  from `src/core/rpc-client` (Blitz-shaped tuples, suspense on by default,
  superjson wire format so `Date` params survive). Components never import
  resolver files — they import the typed stubs from `src/<entity>/client`
  (`src/auth/client-mutations` for auth). Session state: `useSession()` /
  `getAntiCSRFToken()` from `src/auth/client`.
- `getDreams` accepts a Prisma-shaped `{ where, orderBy, skip, take }` built on
  the **client** (see search page) — reuse it before writing a new endpoint.
- Zod schemas for form/mutation payloads live in `src/<entity>/validations.ts`.

## Pages (src/pages/)

- Every page follows the same skeleton: a `BlitzPage`-typed component (the
  historical alias of `AppPage` from `src/core/types`) +
  `Page.authenticate = true|false` + `Page.getLayout = <Layout title=…>` +
  `Suspense fallback={<LoadingSpiral />}`. The `_app` AuthGuard honors
  `authenticate`/`redirectAuthenticatedTo` and keeps private page bodies
  client-only (server-side query data is `undefined` by design). Route helpers
  come from `src/routes.ts` (hand-written manifest, tested against the pages dir).
- Shared visual pattern: sheep PNG (`public/assets/sheep-<page>.png`) in a
  `md={2}/md={8}` MUI Grid, then an `<h1 className="heading">` with a
  handwritten title PNG (`title-<page>.png`) + `sr-only` text.
- Key pages: `dreams/` (journal + calendar), `search/` (advanced search),
  `stats/` (charts), `settings/`, `symbols/`, `blog/` + `faq/` (hardcoded TSX
  content, playful lowercase-"i" copy).
- **Styling**: Tailwind classes for layout, spacing and responsive behaviour;
  `src/styles/Theme.ts` for how MUI components look; `style={}` only for values
  computed at runtime (one place: the measured scale in `SymbolsRadioList`).
  **`sx` is forbidden** — ESLint errors on it (issue #1). Breakpoints are MUI's own
  (`sm` 600 / `md` 900 / `lg` 1200); `xsmax:` is ≤ 320 **inclusive** and `hover:`
  applies on touch too, both via `@custom-variant`. The important modifier is a
  suffix: `min-w-[48px]!`. Utilities reach inside MUI portals (dialogs, menus,
  poppers) — they did not under the old `important: "#__next"` scoping.
- When replacing an `sx`, do not assume it was doing anything: `sx` lands in
  `@layer mui` where a more specific MUI rule can outrank it, and a utility never
  loses that contest. Two `sx` props in this codebase were dead and would have come
  alive as classes. Check the computed value before and after.

## Forms (src/core/components/)

react-hook-form + zod through the shared `<Form>` wrapper (`Form.tsx`, exports
`FORM_ERROR`/`FORM_RESET`). Field building blocks: `LabeledTextField`,
`CheckboxField`, `ToggleButtonField` (icon toggle groups fed by
`FAVORITE_ICONS/TIME_ICONS/MOOD_ICONS/RECALL_ICONS/TYPE_ICONS` from
`src/core/helpers/icons.ts`), `SymbolsRadioList` (predefined symbols grid),
`src/dreams/components/SymbolsAutocomplete` (freeSolo symbol picker that can
create a symbol on the fly via `CreateInstantSymbolContext`).

- **Settings page pattern**: `src/users/components/UpdateUserForm.tsx` is a stack
  of `<Form id=…>` cards sharing one `editForm: FormType` state — a pencil
  IconButton switches a card into edit mode, Cancel `reset()`s it. To add a
  setting: extend the `FormType` union, clone a card (the "bedtime" card is the
  simplest checkbox example), add the field to `UpdateUser` zod schema +
  `updateUser` mutation + `getCurrentUser` select if needed page-side.
- **Search pattern**: `src/pages/search/index.tsx` keeps all filters in URL query
  params (comma-joined, `encodeURI`d); `SearchList` translates them into a Prisma
  `where` with `AND`/`OR`/`in` clauses; `DreamSearchForm` is the collapsible
  advanced form.

## Stats & charts (src/stats/, src/pages/stats/)

- Data: one `getDreams` fetch (server-filtered by `dreamAt` range), then
  **client-side aggregation** in `setChartsData()`
  (`src/stats/helpers/chartsData.ts`; moment-based daily buckets,
  zero/middle-filling for gaps). No server-side groupBy for time series.
- `StatGoogleChart` (react-google-charts): chart type + options keyed by
  `type: "dream" | "mood" | "time" | "type" | "recall"`; `isPdf` variant renders
  bare (used by the PDF export in `src/settings/components/ExportDreams` /
  puppeteer). Remounts on window resize via a `key` hack.
- `StatSymbolChart`: d3 bubble-pack of symbol usage.
- The range ToggleButtonGroup (`day`/`week`/`month`/`custom`/`all`, default
  `month`, defined in `src/stats/helpers/range.ts`) drives the query window and is
  remembered in `sessionStorage` — built for issues #6/#7. `custom` is a from–to
  window backed by two `DreamDatePicker`s (dream-highlighted, in a `Collapse`
  under the toggle card). One source of truth for the window:
  `resolveRangeBounds()` (query `{gte,lte}`, or null for `all`) and
  `resolveChartWindow()` (inclusive day span for the chart zero-fill) — used by
  the three query sites (`StaticStatsCharts`, `AdvancedStats`, `SleepChart`) and
  the two chart helpers (`chartsData`, `sleepChartData`). Preset math is identical
  to the old inline logic (guarded by `range.test.ts` + the helper tests).
- `DreamDatePicker`/`DreamCalendarDay` (`src/dreams/components/`): the
  dream-highlighted calendar day styling, shared by the dreams-page calendar and
  the stats from–to pickers (dream days tinted, today cyan, selected primary).
- **Advanced charting** (opt-in via `User.advancedCharting` on Settings): the
  Stats page _replaces_ the static grid with `AdvancedStats` — a search-page-style
  filter panel (live, debounced, no submit) toggled by the "Advanced" button next
  to the range buttons (MUI `Collapse` keeps the form mounted, so active filter
  values survive collapsing; panel state persists in `sessionStorage`), a
  "N matching dreams" caption, and the same six facet charts as the static grid,
  fed by the _filtered_ subset (reusing `StatGoogleChart`/`StatSymbolChart` +
  `setChartsData`). Filter values persist in `sessionStorage`; "View as list"
  deep-links to Search via the shared URL param format.
- **Sleep chart** (`SleepChart`, shown only when `User.trackSleepingTime` is on):
  full-width row in _both_ static and advanced views (below the filter panel in
  the advanced one); range-driven but independent of the dream filters. Two styles behind a "smooth" checkbox
  (persisted in `sessionStorage`): floating bars (CandlestickChart trick:
  low=open=bedtime, close=high=wake-up) or a mid-sleep line with interval-area
  band. Clock y-axis via `{v, f}` ticks; evening bedtimes are plotted as
  negative offsets from midnight (`sleepChartData.ts`). Rows are NIGHT-ANCHORED
  (spec: 2026-08-09-sleep-night-anchoring-design.md): row N's bedtime belongs to
  the night N→N+1 whatever the clock says (23:00 = before midnight, 02:00 = after);
  each chart column pairs day D's wake-up with day D−1's bedtime (legacy same-row
  entries as fallback); incomplete nights render as gaps. The bedtime "now" button
  files after-midnight presses (before noon) to the previous day's row with a 🌙
  toast — picker-typed values always respect the viewed page. Data via
  `getSleepingTimes` (fetched one extra day before the window so the first night
  finds its bedtime).

## Offline (src/core/offline/, src/dreams/offline/, public/sw.js)

Design and every review ruling:
[docs/superpowers/specs/2026-09-27-offline-pwa-design.md](../docs/superpowers/specs/2026-09-27-offline-pwa-design.md).
Rules of the road are in the root [CLAUDE.md](../CLAUDE.md#offline-mode-pwa--a-first-class-feature-never-a-side-effect);
this is how it is built.

- **Online status**: `useOnlineStatus()` / `isBrowserOnline()` (`onlineStatus.ts`) mirror
  `navigator.onLine` and the `online`/`offline` events — the only signal there is.
  `OfflineSupport` (mounted once in `_app`) toggles `html[data-offline]` (→ `img { filter: grayscale(1) }` in `index.css`), renders the corner ribbon and the one-slot notification
  snackbar (`offlineNotice.ts`); `OfflineBanner` renders in-flow under the header via `Layout`,
  `syncStatus.ts` carries the "log in again" state between them.
- **Query persistence** (`persistedQueries.ts`; pure encode/select/decode in `querySnapshot.ts`):
  allowlisted react-query results are mirrored into `localStorage` `ds.queries.<userId>` (budget
  1.5 MB, 256 KB per entry, newest 50, priority keys first, debounced 1 s, written only while the
  cookie still names that user) and hydrated at boot from the **cookie's** userId — not
  `useSession()`, whose store lags one render behind. Allowlisted keys get `cacheTime: Infinity`
  so a cached day never silently expires offline, and `OfflineSupport` clears the QueryClient when
  the cookie user changes under an open tab. `getDreams` is kept only in its paginated form
  (`take` in the params): the whole-journal stats/search variants are never shown offline. The
  dreams page prefetches the symbol picker's list once per session so symbols can be attached
  offline even if the picker was never opened online. **react-query v4 offline semantics**: a paused query
  returns `data: undefined` WITHOUT suspending — every `useQuery` reachable offline needs the
  `hasCached` / `enabled: online || hasCached` guard and must tolerate `undefined`;
  `keepPreviousData` passes another day's data off as this one's (see `DreamsList`).
- **Outbox + sync** (`src/dreams/offline/`): `outbox.ts` keeps `ds.outbox.<userId>` (a superjson
  array of `PendingDream`; every write re-reads storage first; elements that lost their shape are
  dropped on read). Error classification in `syncOutbox`: `TypeError` → blocked;
  Authentication/CSRF → authRequired; Zod/403/404/other 4xx → parked with `lastError` (retry
  button on the pending card); 408/429/502–504 and a non-JSON 2xx/3xx (captive portal, proxy
  page) → blocked without spending attempts; anything else → up to 10 counted attempts. `syncRunner.ts`: `runSync` (per-tab guard + Web Lock
  `ds.outbox.sync.<userId>`, `ifAvailable`, 60 s retry while blocked online) and `syncNow`
  (pre-logout: waits for the lock, whole step bounded by 10 s). `sendFor` re-checks the cookie
  before every request, so a run can never post under another user's session.
  `usePendingDreams` + `PendingDreamList` render queued dreams on their day, `DreamsCalendar`
  merges their marks. The dreams page queues on `!isBrowserOnline()` and on a fetch `TypeError`.
- **Read-only offline**: `DreamList`/`SymbolCard` hide edit/delete; an edit already open stays,
  Update disabled, `onSubmit` refused; `CreateInstantSymbolDialog` the same with Add;
  `DeletionConfirmationDialog` disables its delete offline (a dialog opened online outlives the
  drop); `SymbolForm` hides the picture upload offline (it saves on its own); `SymbolsAutocomplete`
  offers no "create"; `SleepingTimeForm` is a disabled fieldset over cached values and its picker
  handlers (a portal, outside the fieldset) check `isBrowserOnline()`; the symbols page hides jump
  box/filter/new; stats, settings and search render sheep + title + notice only.
- **Forgetting**: `forgetDeviceData(userId)` (`deviceData.ts`) clears the QueryClient, both
  localStorage keys and tells the worker (`postMessage("ds-logout")`); used by `Header` logout
  (after a best-effort `syncNow`; refused offline, and refused with a notice while any dream is
  still unsynced — the dream's day offers retry/discard) and by account deletion in
  `UpdateUserForm` (only once the server confirmed). At boot,
  `forgetOtherUsersSnapshots` drops `ds.queries.*` of every other user (a session that ended
  without its logout purge) — outboxes stay, they are dreams waiting for that user's next login.
- **Service worker** (`public/sw.js`, registered by `swRegistration.ts` in production only):
  `ds-precache-v2` (`/dreams`, `/faq`, `/blog`, every post and cover name from
  `public/sw-precache.json` — written by `scripts/generate-sw-precache.mjs` at build time,
  git-ignored —, `sheep-offline.png`, `blog-offline.png`); `ds-pages-v2` (visited same-origin
  pages, pathname-keyed, `ok && !redirected` only, wiped on `ds-logout` — sent by logout, account
  deletion and by `AuthGuard` whenever an authenticated page renders to nobody, so it only ever
  holds a logged-in session's shells and is the only cache the slow-link race reads); `ds-static`
  (content-hashed `/_next/static`, cache-first, unversioned on purpose); `ds-assets-v2`
  (stale-while-revalidate, cap 100). Navigations are network-first with a non-aborting 4 s race
  to the shell in `ds-pages-v2` only — a shell from a real navigation, whose chunks went through
  `cacheFirst`; the install-day precache is served offline only (after a deploy its chunks are
  gone from the server). The precache catch-up for new posts runs once per worker start. In
  development `swRegistration` unregisters any worker left by a local production run. Never cached: `/api/`, `/_next/data/`, `/` (a 307 for logged-in users),
  anything cross-origin (images only get a stand-in when their fetch fails). Stand-ins for
  uncached images: a cover name from the manifest or `blog-*` → `blog-offline.png`,
  `title-*`/`logo-*` → transparent 1×1, everything else → `sheep-offline.png` — except CSS
  backgrounds (`background-*`, `button.jpg`; a worker cannot tell them from an `<img>`): the body's
  two blur placeholders are precached, anything else fails so the layer does not paint and the
  `background-color` shows (v6.0.0 painted the sheep across the canvas).
- **Known limits**: the first visit must be online; private windows forget everything; iOS may
  purge storage after ~7 days unused; sign-out is refused offline with a notice (the session
  cookie is HttpOnly, only the server can end a session — pending dreams stay); a
  crash between the server's success and the outbox removal can duplicate a dream (a
  `clientId @unique` column would close it); the outbox's synchronous read→write is not locked
  across tabs (accepted, see `outbox.ts`).

## Testing

- **Unit** (`npm test`, Vitest, config `vitest.config.mts`): colocated
  `*.test.ts` next to the code; pure helpers + zod schemas only. The vitest
  config aliases `db` → `@prisma/client` so importing enums never instantiates
  the Prisma client — don't import `db`'s default export in unit-tested code
  paths. Time-sensitive helpers are tested with `vi.setSystemTime`.
- **E2E** (`npm run test:e2e`, Vitest + puppeteer, config
  `vitest.config.e2e.mts`): `test/e2e/*.e2e.test.ts` drive the real app;
  shared plumbing in `test/e2e/helpers.ts` (login, deletion dialogs, settings
  checkbox cards, pagination). Requires a running dev server + seeded DB;
  flows restore toggled settings and delete what they create. User-created
  symbols land on the LAST pagination page — use `gotoLastPaginationPage`.
- **Visual** (`npm run test:visual`, Playwright, config
  `test/visual/playwright.config.ts`): full-page `toHaveScreenshot` of 29 page states at every
  breakpoint edge (320/321, 375, 599/600, 899/900, 1199/1200) plus computed-style contracts for
  what pixels miss. Baselines are local and gitignored; needs a running **production** build
  (`yarn build && yarn start`) and a seeded DB. Run it before and after any styling change —
  `test/visual/README.md` has the workflow, the determinism tricks and the triage rules.
  Adding a feature: baseline on unchanged `main` FIRST, then build. A brand-new snapshot name
  fails its first compare run ("A snapshot doesn't exist … writing actual"), writes the file and
  passes on the next — so new states announce themselves. Re-baseline only the shots you approve,
  by name, never in bulk.
- **Offline** has both: unit tests next to the code (`src/core/offline/*.test.ts`,
  `src/dreams/offline/*.test.ts` — fake storage, fake timers, Web Lock stand-ins) and
  `test/e2e/offline.e2e.test.ts` (`page.setOfflineMode`, no worker needed, tolerates dreams
  already on today; covers the outbox round trip, the open edit staying read-only, the refused
  offline sign-out, the delete dialog, a dream the server rejects getting parked, and sign-out
  refused while it waits — seeded straight into Local Storage — then discard and a real sign-out). The worker is production-only: `yarn build && yarn start`, DevTools →
  Network → Offline, plain reload. Run the unit suite and the offline spec for any change to
  queries, forms, `Header`/`Layout`, `_app`, the dreams page or `src/*/offline/`.
- CI runs lint + type-check + unit only (`.github/workflows/test.yml`).

## Gotchas

- `useCurrentUser` reads `getCurrentUser`, which `select`s an explicit field
  list — new User fields are invisible to the client until added there.
- Comments reference old GitLab issue URLs (the project migrated to GitHub).
- `moment` is used in stats, `luxon` in date pickers, `date-fns` elsewhere —
  keep using whichever the file already imports.
- **Next 16.2's SWC eats the leading space of any JSX text node that contains an
  HTML entity** — `<Link>…</Link> page … don&apos;t …` renders as `</a>page`
  (tsc/Babel keep it, so the source looks fine and Prettier won't touch it).
  Write the space as `&#32;` glued to the tag (`</Link>&#32;page …`); `{" "}`
  does **not** work — Prettier collapses it back to a literal space whenever the
  text fits on the line. Trailing spaces and entity-free text nodes are fine.
