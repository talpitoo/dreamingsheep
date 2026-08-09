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
- MUI `sx`, MUI `className` and Tailwind utilities are mixed; match whatever the
  surrounding file does (roadmap: gradual move toward Tailwind, maintainer-led).

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
- CI runs lint + type-check + unit only (`.github/workflows/test.yml`).

## Gotchas

- `useCurrentUser` reads `getCurrentUser`, which `select`s an explicit field
  list — new User fields are invisible to the client until added there.
- Comments reference old GitLab issue URLs (the project migrated to GitHub).
- `moment` is used in stats, `luxon` in date pickers, `date-fns` elsewhere —
  keep using whichever the file already imports.
