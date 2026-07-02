# src/ — app architecture & conventions

BlitzJS `2.0.0-beta.31` on Next 13 **pages router**. Domain-driven layout:
`src/<entity>/{queries,mutations,components,validations.ts}`. Shared UI in
`src/core/`. See root [CLAUDE.md](../CLAUDE.md) for the frozen-deps policy.

## Blitz RPC pattern

- Queries/mutations are plain files auto-exposed as RPC:
  `resolver.pipe(resolver.zod(Schema), resolver.authorize(), async (input, ctx) => …)`.
- **Every dream/symbol query is scoped to the logged-in user** — e.g.
  `src/dreams/queries/getDreams.ts` injects `where["userId"] = ctx.session.userId`.
  Never expose cross-user data (hard product rule: dreams are private).
- Client side: `useQuery` / `usePaginatedQuery` / `useMutation` from `@blitzjs/rpc`.
- `getDreams` accepts a Prisma-shaped `{ where, orderBy, skip, take }` built on
  the **client** (see search page) — reuse it before writing a new endpoint.
- Zod schemas for form/mutation payloads live in `src/<entity>/validations.ts`.

## Pages (src/pages/)

- Every page follows the same skeleton: `BlitzPage` component +
  `Page.authenticate = true|false` + `Page.getLayout = <Layout title=…>` +
  `Suspense fallback={<LoadingSpiral />}`.
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
  **client-side aggregation** in `setChartsData()` (moment-based daily buckets,
  zero/middle-filling for gaps). No server-side groupBy for time series.
- `StatGoogleChart` (react-google-charts): chart type + options keyed by
  `type: "dream" | "mood" | "time" | "type" | "recall"`; `isPdf` variant renders
  bare (used by the PDF export in `src/settings/components/ExportDreams` /
  puppeteer). Remounts on window resize via a `key` hack.
- `StatSymbolChart`: d3 bubble-pack of symbol usage.
- The range ToggleButtonGroup on the stats page drives the query window; issues
  #6/#7 extend this — see [../PLAN-issues-6-7.md](../PLAN-issues-6-7.md).

## Gotchas

- `useCurrentUser` reads `getCurrentUser`, which `select`s an explicit field
  list — new User fields are invisible to the client until added there.
- Comments reference old GitLab issue URLs (the project migrated to GitHub).
- `moment` is used in stats, `luxon` in date pickers, `date-fns` elsewhere —
  keep using whichever the file already imports.
