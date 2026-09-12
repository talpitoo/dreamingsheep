# Tailwind CSS v4 + `sx` removal (issue #1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move dreamingsheep from Tailwind 3.2.4 + MUI `sx={{}}` to Tailwind 4.1.18 with CSS cascade layers and zero `sx` props, with the rendered UI pixel-identical at every breakpoint edge — proven by a Playwright snapshot suite that is built and baselined BEFORE anything else changes.

**Architecture:** One branch (`tailwind-v4`), one PR, milestone commits. M0 adds the visual-regression harness (no app code touched) and the local baselines are generated at that commit. M1 flips Tailwind to 4.1.18 and puts MUI's emotion output into `@layer mui` under an explicit `@layer theme, base, mui, components, utilities` order (eight lines in our own emotion cache — no MUI bump). M2 moves the toggle-button CSS into `Theme.ts`. M3 removes the 279 `sx` usages page group by page group, every commit snapshot-clean. M4 adds the ESLint guard and docs. Nothing deploys until the maintainer bumps the version and pushes a tag.

**Tech Stack:** Next 16.2.12 (pages router, Turbopack) · React 18.2.0 · MUI 5.14.11 (`@mui/system`/`@mui/styled-engine` resolve to 5.18.0 in `yarn.lock`) · emotion 11.11 (`@emotion/cache` 11.14.0, stylis 4.2.0) · Tailwind **4.1.18** via `@tailwindcss/postcss` 4.1.18 · `@playwright/test` **1.63.0** (Chromium only) · Node 22 · yarn 1 lockfile.

**Spec:** the "Design decisions" section below (approved in chat by the maintainer on 2026-09-11 — there is no separate spec file). The maintainer's sister-project recipe (`instructions.md`, MUI 9 / Tailwind 4.3 / Vite, not in this repo) served as the worked example; where this plan deviates from it (no `tw:` prefix, no `cssVariables`, MUI spacing stays 8px, single theme file) the deviation is deliberate and listed below.

## Design decisions (approved 2026-09-11)

- **Browser floor moves to the Tailwind v4 floor.** v4 wraps everything in `@layer`; browsers without cascade-layer support (Safari/iOS < 15.4, Chrome < 99, Firefox < 97, "ancient WebKits" such as the Kindle browser the grid-spacer fix targeted) get an unstyled page. Full-fidelity rendering starts at Safari 16.4 / Chrome 111 / Firefox 128; v4.1 ships fallbacks in between. Maintainer accepted this (a look at the GA browser report was suggested).
- **Cascade layers, `@layer theme, base, mui, components, utilities`** — MUI's documented v4 integration. Utilities beat MUI everywhere, including portaled content (dialogs, menus, poppers), which under today's `important: "#__next"` scoping is inert. MUI stays at 5.14.11: the installed `@mui/styled-engine` 5.18.0 already contains the `enableCssLayer` cache wrapper; we copy its eight lines into `src/createEmotionCache.ts` so the pages-router SSR extraction sees layered CSS too.
- **Playwright `@playwright/test` 1.63.0** takes the snapshots (`toHaveScreenshot`, per-viewport projects, clock freezing, HTML diff report). The puppeteer e2e suite is untouched.
- **Baselines stay local and gitignored** (full-page PNGs with the photo backgrounds are 0.5–1 GB per full matrix). Generated on the M0 commit, compared on every later milestone. A slimmed committed set for CI is a later decision.
- **Tailwind pinned to 4.1.18** (latest of the 4.1 line: mature, has the older-browser fallbacks). Bump further only after the snapshots are clean.
- **PostCSS pipeline simplified**: `autoprefixer` and `postcss` are removed (maintainer: "go with the cleaner, long-term solution"); `@tailwindcss/postcss` prefixes for its own targets. A before/after diff of vendor prefixes in the built CSS is part of M1 verification.
- **One PR, milestone commits** (maintainer preference). Releases happen only via `new version vX.Y.Z` + tag (`.github/workflows/deploy.yml` triggers on tags), so merging is safe at any point; the maintainer releases once everything is visually verified and triple-checked.
- **Viewport matrix = breakpoint edges only**: 320/321 (`xsmax`, inclusive ≤ 320), 599/600 (`sm`), 899/900 (`md`), 1199/1200 (`lg`), plus 375 as a common-phone device sample (not a breakpoint; drop it if a pure edge matrix is preferred). 1280 and 1440 were dropped: nothing in `src/` reacts above 1200px (see facts), they were only the e2e suite's default viewport.
- **Focused / hovered form fields are part of the matrix**, in particular the glued login / change-password / signup / reset fields (`-1px` overlap, rounded corners removed on the joint, cyan focus outline).
- Deviations from the reference recipe, on purpose: no `tw:` prefix (would touch every class, no collisions exist); no `createTheme({ cssVariables })` (MUI 6+ only; the four hex colours live in `@theme` with a cross-reference comment); MUI `spacing` stays 8px (so `ml: 2` → `ml-4`); `Theme.ts` stays one file; no per-family theme files; no Preflight (MUI `CssBaseline` remains the reset, as today).

## Facts established during planning (evidence the tasks rely on)

- `sx` census: **279 usages in 57 files** (`grep -rn "sx={" src --include=*.tsx | wc -l`). Top files: UpdateUserForm 20, terms 19, privacy 19, Header 18, faq 17, stats 15. 85× `sx={{ mb: 2 }}`, 48× `sx={{ paddingBottom: "0" }}`.
- Breakpoints: `src/styles/Theme.ts` overrides nothing, so MUI defaults apply — verified empirically: `createTheme().breakpoints.values` = `{xs:0, sm:600, md:900, lg:1200, xl:1536}`. `tailwind.config.js` sets `sm: 600px, md: 900px, lg: 1200px`, `xsmax: {max: 320px}`, `smmax: {max: 375px}` (unused). Tailwind prefixes used: `md:` 25, `lg:` 15, `xsmax:` 6, `sm:` 3. sx responsive keys used: xs/sm/md/lg. Grid props: xs/sm/md/lg. `useMediaQuery(theme.breakpoints.up("md"))` in Header. `Container` default `maxWidth="lg"` (1200), `Dialog maxWidth="sm"`, ExportDreams dialog `maxWidth="lg"`. **Nothing reacts above 1200px** (no `xl`/`2xl`/1280/1536 anywhere in `src/`).
- `important: "#__next"` today means every utility is `#__next .p-4`, so Tailwind classes inside MUI portals (Dialog, Menu, Popper, Autocomplete listbox) do nothing: `DeletionConfirmationDIalog.tsx` and `CreateInstantSymbolDialog.tsx` buttons carry `max-w-[89px]`/`max-w-[113px]`, and `.MuiModal-root .temporary-img-fix` in `index.css` exists precisely because `w-full h-auto max-w-[300px]` is inert in the modal.
- `postcss.config.js` = `tailwindcss` + `autoprefixer`; `corePlugins.preflight: false`; `index.css` uses `@tailwind` directives, `@layer base/components/utilities`, `@screen sm`, `@apply … !important`, and a block of UNLAYERED `.Mui*` overrides (toggle buttons, `.text-outline`, image upload, picker, `header .MuiOutlinedInput-notchedOutline`).
- v3→v4 renames present in the code: `flex-grow` (Header:128 → `grow`), `shadow` (SymbolsRadioList:117 → `shadow-sm`), `hover:!no-underline` (Header:306 → `hover:no-underline!`). The three `"rounded"` hits are MUI `shape="rounded"` props, not classes. `border-r` in ErrorStatus already carries `border-current`. No `space-*`, `*-opacity-*`, `ring`, `outline-none`, `container`, `bg-gradient-*`.
- Default palette utilities in use: `text-gray-400` (10), `bg-white` (7), `bg-white/80` (2), `text-black` (1). v4 moved the palette to oklch, so `--color-gray-400` is pinned to the v3 hex `#9ca3af` (white/black are identical in both).
- Next 16's `_document` `<Head>` renders its children BEFORE the CSS `<link>`s (`node_modules/next/dist/pages/_document.js`, `head, children, …, getCssLinks`). So the emotion SSR tags come first in `<head>`; the layer-order statement must be the first `<Head>` child, before `<meta name="emotion-insertion-point">`.
- Spike 1 (scratchpad, repo's own emotion/stylis): the `@layer mui` insert wrapper survives `extractCriticalToChunks`; nested selectors and media queries hoist correctly: `@layer mui{.mui-style-x{padding:8px;}.mui-style-x:hover{color:red;}@media (min-width:600px){.mui-style-x{display:flex;}}}`; Global styles too.
- Spike 2 (Tailwind 4.1.18 CLI): a leading `@layer theme, base, mui, components, utilities;` is preserved as the first user statement (Tailwind's own `@layer properties;` goes before it, weakest); `@import "tailwindcss/theme.css" layer(theme)` + `utilities.css layer(utilities)` (no preflight) works; `@custom-variant xsmax (@media (width <= 320px))` is inclusive; `@custom-variant hover (&:hover)` removes the `(hover: hover)` gate; breakpoints emit `width >= 600px/900px/1200px`; `@utility` + `@apply md:w-2/12` works; every class prescribed in Task 12 compiles to the intended declarations (e.g. `-mt-22` → `margin-top: calc(var(--spacing) * -22)`, `min-w-[48px]!` → `min-width: 48px !important`, `bg-[lightgray]!`, `rounded-b-none`, `-mt-px`, `[&>span]:mr-4`, `print:block`, `[transform:rotate(180deg)]`).
- Dev output of v4 uses native CSS nesting (`.hover\:underline { &:hover {…} }`); the production build (`@tailwindcss/postcss` optimizes when `NODE_ENV=production`) flattens it via Lightning CSS. Baseline and compare runs therefore use the production build.
- Seeded demo data (`db/utils/seedDefaultDreams.ts`) is dated relative to the seed day: dreams at −1 (four), −2 (two), −3, −7, −9 ("The Butterfly Dream") days. The home-page counters (`getServerSideProps`, last-31-days window) change as the seed ages → masked in snapshots.
- `yarn install` (no `--production`) in both `Dockerfile` and `deploy.yml`, so devDependencies are installed everywhere; `tailwindcss` nevertheless stays in `dependencies` where it is today.

## Global Constraints

- Branch `tailwind-v4` off `main` (`b017ffd`, v4.4.0). One PR. Commit at the end of every task with the message given. **No `"version"` bump, no tag** — the maintainer releases.
- **Frozen dependencies** (root `CLAUDE.md`). The only allowed changes: `tailwindcss` 3.2.4 → **4.1.18** (stays in `dependencies`); add `@tailwindcss/postcss` **4.1.18** (`dependencies`); remove `autoprefixer` and `postcss`; add devDependency `@playwright/test` **1.63.0**. Exact versions, no carets. Nothing else moves — not MUI, not emotion, not React, not Next.
- Yarn 1: `yarn add --exact …` / `yarn remove …`; commit `yarn.lock`; `yarn install --frozen-lockfile` must pass. `nvm use 22` first.
- **Visual parity is the acceptance bar.** Every `toHaveScreenshot` diff is either fixed or listed in the PR with a one-line reason and the maintainer's OK. Never blanket-run `--update-snapshots`; update named tests only (`-g "<name>"`) after approval.
- Baseline and compare runs both target a **production build** (`yarn build && yarn start`) on the same machine, the same seeded DB, the same `VISUAL_SEED_DATE`/`VISUAL_CAPTURE` (persisted in `test/visual/__snapshots__/meta.json`). Do not re-seed between baseline and compare.
- Prettier: no semicolons, printWidth 100 (lint-staged runs `eslint --fix` on commit). Copy tone unchanged.
- Unit (`npm test`), e2e (`npm run test:e2e`, needs a running server + seeded DB), lint, `npm run type:check` (~58 pre-existing `noImplicitAny` errors are parked, issue #3 — capture the baseline count before Task 8 and never exceed it) and `yarn build` stay green after every task.
- No DB schema changes; no resolver-file changes; MUI spacing stays 8px; no `tw:` prefix; no Preflight.
- Old GitLab URLs in comments stay; new comments reference `issue #1`.

## Milestones and commits

| Milestone                           | Tasks | Commit message                                                                    | Snapshot gate                  |
| ----------------------------------- | ----- | --------------------------------------------------------------------------------- | ------------------------------ |
| M0 visual harness                   | 1–7   | `test(visual): playwright snapshot suite across every breakpoint edge (#1)`       | baselines generated here       |
| M1 Tailwind 4.1.18 + cascade layers | 8–10  | `feat(styles): tailwind 4.1.18 + cascade layers, MUI in @layer mui (#1)`          | 0 diffs (or listed + approved) |
| M2 Theme.ts                         | 11    | `refactor(theme): toggle-button overrides move from index.css into Theme.ts (#1)` | 0 diffs                        |
| M3 `sx` removal                     | 12–19 | `refactor(<scope>): sx → tailwind classes (#1)` per group                         | 0 diffs per group              |
| M4 guard + docs                     | 20–21 | `chore(lint): forbid sx; document the tailwind v4 conventions (#1)`               | full run 0 diffs               |

## File map

```
test/visual/                          # M0 — new, mirrors test/e2e conventions
  playwright.config.ts                # 9 viewport projects, expect defaults, snapshot path template
  global-setup.ts                     # server check, run parameters (meta.json), login → .auth/, settings reset
  helpers.ts                          # prepare() / settle() / shot() / setCheckboxSetting() / gotoLastPaginationPage()
  freeze.css                          # stylePath: pauses animations, hides caret + reCAPTCHA badge while capturing
  public.visual.test.ts               # anonymous pages + login-field focus states
  dreams.visual.test.ts               # journal, card edit, new-dream form, autocomplete, dialogs
  search-symbols.visual.test.ts       # search + filters, symbols list/edit/new
  settings.visual.test.ts             # five cards in edit mode, focus states, export + delete dialogs
  stats.visual.test.ts                # ranges, custom pickers, advanced panel, sleep chart (settings toggled)
  header.visual.test.ts               # mobile menu, account menu, header search focus
  contracts.visual.test.ts            # computed-style assertions at the edges (things pixels can miss)
  layers.visual.test.ts               # M1 — cascade order + every emotion rule inside @layer mui
  README.md
  __snapshots__/ .auth/ test-results/ playwright-report/   # gitignored
src/styles/index.css                  # M1 — rewritten for v4 (full content in Task 8)
src/createEmotionCache.ts             # M1 — @layer mui wrapper
src/pages/_document.tsx               # M1 — inline layer-order <style> as first <Head> child
postcss.config.js                     # M1 — @tailwindcss/postcss only
tailwind.config.js                    # M1 — deleted
src/styles/Theme.ts                   # M2 — MuiToggleButtonGroup / MuiToggleButton overrides
.eslintrc.js                          # M4 — react/forbid-component-props for sx
CLAUDE.md, src/CLAUDE.md, ROADMAP.md, .claude/skills/verify/SKILL.md   # M0/M4 docs
```

## Running the visual suite (reference for every task)

```bash
nvm use 22
# 1. seeded DB running (docker postgres, see db/CLAUDE.md), then a PRODUCTION build on :3000
yarn build && yarn start                      # or point VISUAL_BASE_URL at a running prod instance
# 2. baselines (first time, or after an APPROVED change — named tests only!)
VISUAL_SEED_DATE=2026-09-11 yarn test:visual:update          # the day `npm run db:seed` ran
# 3. compare (any later commit); report opens in the browser
yarn test:visual && yarn test:visual:report
# partial runs while iterating
yarn test:visual -- --project w320 -g "settings-edit"
```

---

### Task 1: Playwright dependency, scripts, ignores

**Files:**

- Modify: `package.json` (devDependencies, scripts)
- Modify: `.gitignore`
- Modify: `test/e2e/helpers.ts:1-15` (comment only — mention the sibling suite)

**Interfaces:**

- Produces: npm scripts `test:visual`, `test:visual:update`, `test:visual:report` used by every later task.

- [ ] **Step 1: Install Playwright (exact) and its Chromium**

```bash
nvm use 22
yarn add --dev --exact @playwright/test@1.63.0
npx playwright install chromium
node -p "require('@playwright/test/package.json').version"   # expect 1.63.0
```

- [ ] **Step 2: Add the scripts** — in `package.json` `"scripts"`, after `"test:e2e"`:

```json
"test:visual": "playwright test -c test/visual/playwright.config.ts",
"test:visual:update": "playwright test -c test/visual/playwright.config.ts --update-snapshots",
"test:visual:report": "playwright show-report test/visual/playwright-report"
```

- [ ] **Step 3: Ignore the generated artefacts** — append to `.gitignore` under `# Testing`:

```
# visual regression (Playwright): baselines stay local (see test/visual/README.md)
test/visual/__snapshots__/
test/visual/.auth/
test/visual/test-results/
test/visual/playwright-report/
```

- [ ] **Step 4: Verify** `yarn install --frozen-lockfile` passes and `git diff package.json` shows only the three scripts and the one devDependency. Do not commit yet (M0 is one commit, Task 7).

### Task 2: Playwright config, freeze.css, helpers

**Files:**

- Create: `test/visual/playwright.config.ts`
- Create: `test/visual/freeze.css`
- Create: `test/visual/helpers.ts`

**Interfaces:**

- Produces: `VIEWPORTS`, `prepare(page, {cookieNotice?})`, `settle(page)`, `shot(page, name, {mask?})`, `width(page)`, `seedDate()`, `daysFromSeed(n)`, `settingsPencil(page, formId)`, `setCheckboxSetting(page, formId, desired?)`, `gotoLastPaginationPage(page)`.

- [ ] **Step 1: `test/visual/playwright.config.ts`**

```ts
import { defineConfig } from "@playwright/test"
import path from "path"

// Every breakpoint edge in the codebase, both sides, plus 375 as a common-phone sample.
// tailwind screens: xsmax ≤ 320 (inclusive), sm 600, md 900, lg 1200 — identical to MUI's
// defaults (createTheme().breakpoints.values), so one matrix covers sx and className rules.
// Nothing in src/ reacts above 1200px. Heights are device-ish; captures are full-page anyway.
export const VIEWPORTS = [
  { name: "w320", width: 320, height: 568 },
  { name: "w321", width: 321, height: 568 },
  { name: "w375", width: 375, height: 667 },
  { name: "w599", width: 599, height: 900 },
  { name: "w600", width: 600, height: 900 },
  { name: "w899", width: 899, height: 900 },
  { name: "w900", width: 900, height: 900 },
  { name: "w1199", width: 1199, height: 900 },
  { name: "w1200", width: 1200, height: 900 },
]

export default defineConfig({
  testDir: __dirname,
  testMatch: /.*\.visual\.test\.ts$/,
  outputDir: path.join(__dirname, "test-results"),
  snapshotPathTemplate: "{testDir}/__snapshots__/{projectName}/{testFileName}/{arg}{ext}",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  globalSetup: path.join(__dirname, "global-setup.ts"),
  reporter: [
    ["list"],
    ["html", { outputFolder: path.join(__dirname, "playwright-report"), open: "never" }],
  ],
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      scale: "css",
      maxDiffPixels: 0,
      stylePath: path.join(__dirname, "freeze.css"),
    },
  },
  use: {
    baseURL: process.env.VISUAL_BASE_URL || "http://localhost:3000",
    browserName: "chromium",
    deviceScaleFactor: 1,
    colorScheme: "light",
    locale: "en-US",
    timezoneId: "Europe/Budapest",
    storageState: path.join(__dirname, ".auth", "zhuangzi.json"),
    trace: "retain-on-failure",
  },
  projects: VIEWPORTS.map((viewport) => ({
    name: viewport.name,
    use: { viewport: { width: viewport.width, height: viewport.height } },
  })),
})
```

- [ ] **Step 2: `test/visual/freeze.css`** (applied only while capturing)

```css
/* toHaveScreenshot stylePath: removes time-based noise during capture */
*,
*::before,
*::after {
  animation-play-state: paused !important;
  caret-color: transparent !important;
}
html,
body {
  scroll-behavior: auto !important;
}
.loading-spiral {
  animation: none !important;
}
/* Google injects the reCAPTCHA badge iframe on the signup page */
.grecaptcha-badge {
  visibility: hidden !important;
}
```

- [ ] **Step 3: `test/visual/helpers.ts`**

```ts
import { expect, Locator, Page } from "@playwright/test"

export const ZHUANGZI = { email: "zhuangzi@dreamingsheep.net", password: "zhuangzi" }

// third parties that inject non-deterministic pixels or beacons; Google Charts (gstatic.com/charts)
// stays allowed — the stats page needs it
const BLOCKED = ["googletagmanager.com", "google-analytics.com", "/recaptcha/"]

/** YYYY-MM-DD of the day `npm run db:seed` ran — set by global-setup.ts (persisted in meta.json) */
export function seedDate(): string {
  const value = process.env.VISUAL_SEED_DATE
  if (!value) throw new Error("VISUAL_SEED_DATE is not set — global-setup.ts did not run")
  return value
}

/** seedDate ± n days as YYYY-MM-DD (pure UTC arithmetic, no time-zone surprises) */
export function daysFromSeed(offset: number): string {
  const [year, month, day] = seedDate().split("-").map(Number) as [number, number, number]
  return new Date(Date.UTC(year, month - 1, day + offset)).toISOString().slice(0, 10)
}

export const width = (page: Page) => page.viewportSize()!.width

export interface PrepareOptions {
  /** leave the cookie notice un-acknowledged (default: acknowledged, so it never shows) */
  cookieNotice?: boolean
}

/** Call before the first page.goto(): blocks third parties, freezes the clock, hides the cookie notice. */
export async function prepare(page: Page, options: PrepareOptions = {}) {
  await page.route("**/*", (route) => {
    const url = route.request().url()
    return BLOCKED.some((fragment) => url.includes(fragment)) ? route.abort() : route.continue()
  })
  // Date / luxon DateTime.now() / moment() freeze at 10:00 on the seed day; timers keep running,
  // so MUI transitions and Collapse still complete
  await page.clock.setFixedTime(new Date(`${seedDate()}T10:00:00`))
  if (!options.cookieNotice) {
    await page.addInitScript(() => window.localStorage.setItem("cookieNoticeAcknowledged", "true"))
  }
}

/** Network idle, fonts loaded, suspense fallbacks gone, MUI transitions (≤ 300ms) run out. */
export async function settle(page: Page) {
  await page.waitForLoadState("networkidle")
  await expect(page.locator(".loading-spiral")).toHaveCount(0, { timeout: 30_000 })
  await page.evaluate(async () => {
    await document.fonts.ready
    await new Promise((resolve) => setTimeout(resolve, 700))
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  })
}

export interface ShotOptions {
  mask?: Locator[]
}

/**
 * Screenshot compared with __snapshots__/<project>/<file>/<name>.png.
 * VISUAL_CAPTURE=fullpage (default) uses Chromium's captureBeyondViewport; VISUAL_CAPTURE=tall
 * resizes the viewport to the document height instead (fallback if the sticky AppBar renders
 * wrongly, see README). The mode is persisted in meta.json so baseline and compare runs match.
 */
export async function shot(page: Page, name: string, options: ShotOptions = {}) {
  await settle(page)
  if (process.env.VISUAL_CAPTURE === "tall") {
    const viewport = page.viewportSize()!
    const height = await page.evaluate(() => document.documentElement.scrollHeight)
    await page.setViewportSize({ width: viewport.width, height: Math.max(height, viewport.height) })
    await settle(page)
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: false, mask: options.mask })
    await page.setViewportSize(viewport)
  } else {
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true, mask: options.mask })
  }
}

/** the pencil IconButton of a Settings card (<form id={formId}>) */
export const settingsPencil = (page: Page, formId: string) =>
  page.locator(`form#${formId} button.MuiIconButton-root`)

/**
 * Read or change one of the Settings checkbox cards (form ids "bedtime", "advanced-charting").
 * Port of test/e2e/helpers.ts setCheckboxSetting. Returns the state found before any change.
 */
export async function setCheckboxSetting(page: Page, formId: string, desired?: boolean) {
  await page.goto("/settings")
  const checkbox = page.locator(`form#${formId} input[type="checkbox"]`)
  await expect(checkbox).toBeAttached({ timeout: 30_000 })
  const before = await checkbox.isChecked()
  if (desired === undefined || desired === before) return before
  await settingsPencil(page, formId).click()
  await checkbox.click()
  await page.locator(`button[type="submit"][form="${formId}"]`).click()
  // the settings page reloads on success (src/pages/settings/index.tsx)
  await page.waitForLoadState("networkidle")
  const after = page.locator(`form#${formId} input[type="checkbox"]`)
  await expect(after).toBeAttached({ timeout: 30_000 })
  await expect(after).toBeChecked({ checked: desired })
  return before
}

/** Jump to the last page of an MUI pagination, if one is present (user symbols land there). */
export async function gotoLastPaginationPage(page: Page) {
  const items = page.locator(".MuiPagination-ul .MuiPaginationItem-page")
  const count = await items.count()
  if (count === 0) return
  const last = items.nth(count - 1)
  if ((await last.getAttribute("aria-current")) !== "true") await last.click()
}
```

- [ ] **Step 4: Type-check** `npm run type:check 2>&1 | tail -1` — error count unchanged from `main` (the new files compile; `@types/node` 24 is already hoisted).

### Task 3: global-setup (server check, run parameters, login, settings reset)

**Files:**

- Create: `test/visual/global-setup.ts`

**Interfaces:**

- Consumes: `ZHUANGZI`, `setCheckboxSetting` from `helpers.ts`.
- Produces: `process.env.VISUAL_SEED_DATE`, `process.env.VISUAL_CAPTURE` (read by `helpers.ts`), `test/visual/.auth/zhuangzi.json` (storage state used by every authenticated spec), `test/visual/__snapshots__/meta.json`.

- [ ] **Step 1: Write it**

```ts
import { chromium, FullConfig } from "@playwright/test"
import fs from "fs"
import path from "path"
import { setCheckboxSetting, ZHUANGZI } from "./helpers"

const SNAPSHOTS_DIR = path.join(__dirname, "__snapshots__")
const META_FILE = path.join(SNAPSHOTS_DIR, "meta.json")
const AUTH_FILE = path.join(__dirname, ".auth", "zhuangzi.json")

interface Meta {
  seedDate: string // the day `npm run db:seed` ran — the seeded dreams are dated relative to it
  capture: "fullpage" | "tall" // see helpers.ts shot()
}

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL ?? "http://localhost:3000"
  try {
    await fetch(baseURL)
  } catch {
    throw new Error(
      `dreamingsheep is not running at ${baseURL} — start the production build first:\n` +
        `  nvm use 22 && yarn build && yarn start   (seeded DB: npm run db:seed)\n` +
        `or point VISUAL_BASE_URL at a running instance.`
    )
  }

  // baseline runs (--update-snapshots / -u) record the run parameters; compare runs reuse them,
  // so the frozen clock and the capture mode match the baselines whatever day it is
  const updating = process.argv.some((arg) => arg === "--update-snapshots" || arg === "-u")
  const stored: Partial<Meta> = fs.existsSync(META_FILE)
    ? JSON.parse(fs.readFileSync(META_FILE, "utf8"))
    : {}
  const meta: Meta = {
    seedDate:
      process.env.VISUAL_SEED_DATE ??
      (updating ? undefined : stored.seedDate) ??
      new Date().toISOString().slice(0, 10),
    capture:
      (process.env.VISUAL_CAPTURE as Meta["capture"] | undefined) ??
      (updating ? undefined : stored.capture) ??
      "fullpage",
  }
  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true })
  fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2) + "\n")
  process.env.VISUAL_SEED_DATE = meta.seedDate
  process.env.VISUAL_CAPTURE = meta.capture

  // log in once; every authenticated spec starts from this storage state
  const browser = await chromium.launch()
  const page = await browser.newPage({ baseURL })
  await page.goto("/")
  await page.fill('input[name="email"]', ZHUANGZI.email)
  await page.fill('input[name="password"]', ZHUANGZI.password)
  await page.keyboard.press("Enter")
  await page.waitForURL("**/dreams**", { timeout: 60_000 })
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })
  await page.context().storageState({ path: AUTH_FILE })

  // stats.visual.test.ts switches these two settings on and restores them; if an earlier run
  // died midway, put them back to the seeded OFF state before anything is captured
  await setCheckboxSetting(page, "bedtime", false)
  await setCheckboxSetting(page, "advanced-charting", false)
  await browser.close()
}
```

- [ ] **Step 2: Smoke it** — with the prod server running: `yarn test:visual -- --list` (lists 0 tests, but global setup is not run by `--list`); then `yarn test:visual -- --project w1200 -g nothing` runs global setup only. Expect `test/visual/.auth/zhuangzi.json` and `__snapshots__/meta.json` to exist.

### Task 4: Public-page snapshots

**Files:**

- Create: `test/visual/public.visual.test.ts`

- [ ] **Step 1: Write the spec**

```ts
import { test } from "@playwright/test"
import { prepare, shot } from "./helpers"

// anonymous visitor: no stored session
test.use({ storageState: { cookies: [], origins: [] } })

const PAGES: [string, string][] = [
  ["home", "/"],
  ["signup", "/signup"],
  ["forgot-password", "/forgot-password"],
  ["reset-password", "/reset-password?token=visual-regression"],
  ["verify-user", "/verify-user?token=visual-regression"],
  ["blog", "/blog"],
  ["blog-off-the-charts", "/blog/use-case-three-off-the-charts"],
  ["blog-patreon", "/blog/support-us-on-patreon"],
  ["faq", "/faq"],
  ["privacy-policy", "/privacy-policy"],
  ["terms-of-service", "/terms-of-service"],
  ["not-found", "/this-page-does-not-exist"],
  ["login-fallback", "/stats"], // a private page as a visitor → the "session expired" login fallback
]

// the home-page counters (getServerSideProps, last-31-days window) drift as the seed ages
const homeMask = (page: import("@playwright/test").Page) => ({ mask: [page.locator("strong")] })

for (const [name, url] of PAGES) {
  test(name, async ({ page }) => {
    await prepare(page)
    await page.goto(url)
    await shot(page, name, name === "home" ? homeMask(page) : {})
  })
}

test("home-cookie-notice", async ({ page }) => {
  await prepare(page, { cookieNotice: true })
  await page.goto("/")
  await shot(page, "home-cookie-notice", homeMask(page))
})

// the login form glues its two fields (no radius on the joint, -1px overlap); the focused field
// must paint its cyan outline on top without a thicker centre line
for (const field of ["email", "password"]) {
  test(`home-login-${field}-focused`, async ({ page }) => {
    await prepare(page)
    await page.goto("/")
    await page.locator(`input[name="${field}"]`).focus()
    await shot(page, `home-login-${field}-focused`, homeMask(page))
  })
}

test("signup-password-focused", async ({ page }) => {
  await prepare(page)
  await page.goto("/signup")
  await page.locator('input[name="password"]').focus()
  await shot(page, "signup-password-focused")
})
```

- [ ] **Step 2: Run** `yarn test:visual:update -- --project w320 --project w1200 public` — 18 tests pass and write PNGs under `__snapshots__/w320/public.visual.test.ts/` and `…/w1200/…`. Open two of them (`home.png`, `blog-off-the-charts.png` at w320): the sticky AppBar is absent for visitors, the page is complete top to bottom, the background photo is present. If `verify-user` proves unstable (it fires a mutation on mount), remove that entry and note it in the README.

### Task 5: Dreams, search/symbols, settings snapshots

**Files:**

- Create: `test/visual/dreams.visual.test.ts`
- Create: `test/visual/search-symbols.visual.test.ts`
- Create: `test/visual/settings.visual.test.ts`

- [ ] **Step 1: `dreams.visual.test.ts`**

```ts
import { expect, Page, test } from "@playwright/test"
import { daysFromSeed, prepare, seedDate, shot } from "./helpers"

const firstCard = (page: Page) => page.locator(".MuiCard-root").first()
// the day before the seed day carries four seeded dreams (db/utils/seedDefaultDreams.ts)
const yesterday = () => `/dreams?date=${daysFromSeed(-1)}`

test.beforeEach(async ({ page }) => {
  await prepare(page)
})

test("dreams-today-empty", async ({ page }) => {
  await page.goto(`/dreams?date=${seedDate()}`)
  await shot(page, "dreams-today-empty")
})

test("dreams-list", async ({ page }) => {
  await page.goto(yesterday())
  await shot(page, "dreams-list")
})

// the card toggles into edit mode with the -mx-4 margin animation; captured after it settles
test("dreams-card-edit", async ({ page }) => {
  await page.goto(yesterday())
  await firstCard(page).locator("button:has(span.lucidicon-pencil)").click()
  await expect(firstCard(page).locator("form")).toBeVisible()
  await shot(page, "dreams-card-edit")
  await firstCard(page).locator('input[name="title"]').focus()
  await shot(page, "dreams-card-edit-title-focused")
})

test("dreams-delete-dialog", async ({ page }) => {
  await page.goto(yesterday())
  await firstCard(page).locator("button:has(span.lucidicon-trash)").click()
  await expect(page.locator(".MuiDialog-root")).toBeVisible()
  await shot(page, "dreams-delete-dialog")
})

test("dreams-new-form", async ({ page }) => {
  await page.goto(yesterday())
  await page.getByRole("button", { name: "New dream" }).click()
  await expect(page.locator("form#create-dream")).toBeVisible()
  await shot(page, "dreams-new-form")
  await page.locator('form#create-dream input[name="title"]').focus()
  await shot(page, "dreams-new-form-title-focused")
  await page.getByRole("button", { name: "More" }).click()
  await shot(page, "dreams-new-form-more") // time / mood / recall / type toggle buttons
  // the symbols autocomplete popup is portaled to <body>
  await page.locator("#tags-filled").click()
  await page.keyboard.type("s")
  await expect(page.locator('[role="listbox"]')).toBeVisible()
  await shot(page, "dreams-symbols-autocomplete-open")
  // a name matching no symbol offers `Add "…"`, which opens the instant-symbol dialog (portaled)
  await page.locator("#tags-filled").fill("visualregression")
  await page.locator('[role="option"]', { hasText: 'Add "visualregression"' }).click()
  await expect(page.locator(".MuiDialog-root")).toBeVisible()
  await shot(page, "dreams-instant-symbol-dialog")
})
```

- [ ] **Step 2: `search-symbols.visual.test.ts`**

```ts
import { expect, test } from "@playwright/test"
import { gotoLastPaginationPage, prepare, shot } from "./helpers"

test.beforeEach(async ({ page }) => {
  await prepare(page)
})

test("search-empty", async ({ page }) => {
  await page.goto("/search")
  await shot(page, "search-empty")
})

test("search-filters-open", async ({ page }) => {
  await page.goto("/search")
  // ButtonGroup: [Filters (icon only below sm)] [Search]
  await page.locator(".MuiButtonGroup-root button").first().click()
  await expect(page.locator("form#search-dream .MuiCollapse-entered")).toBeVisible()
  await shot(page, "search-filters-open")
})

test("search-results", async ({ page }) => {
  await page.goto("/search?q=butterfly")
  await shot(page, "search-results")
})

test("symbols-list", async ({ page }) => {
  await page.goto("/symbols")
  await shot(page, "symbols-list")
  await gotoLastPaginationPage(page)
  await shot(page, "symbols-last-page")
})

test("symbols-card-edit", async ({ page }) => {
  await page.goto("/symbols")
  const card = page.locator(".MuiCard-root").first()
  await card.locator("button:has(span.lucidicon-pencil)").click()
  await expect(card.locator("form")).toBeVisible()
  await shot(page, "symbols-card-edit")
  await card.locator('input[name="name"]').focus()
  await shot(page, "symbols-card-edit-name-focused")
})

test("symbols-new-form", async ({ page }) => {
  await page.goto("/symbols")
  await page.getByRole("button", { name: "New symbol" }).click()
  await expect(page.locator('input[name="name"]').first()).toBeVisible()
  await shot(page, "symbols-new-form")
})
```

- [ ] **Step 3: `settings.visual.test.ts`**

```ts
import { expect, test } from "@playwright/test"
import { prepare, settingsPencil, shot } from "./helpers"

const FORMS = ["user", "change-password", "symbols", "bedtime", "advanced-charting"]
const FOCUS: Record<string, string> = { user: "username", "change-password": "password" }

test.beforeEach(async ({ page }) => {
  await prepare(page)
})

test("settings", async ({ page }) => {
  await page.goto("/settings")
  await shot(page, "settings")
})

// each card slides into edit mode (-mx-4, the symbols card additionally scales its toggle grid)
for (const formId of FORMS) {
  test(`settings-edit-${formId}`, async ({ page }) => {
    await page.goto("/settings")
    await settingsPencil(page, formId).click()
    await expect(page.locator(`button[type="submit"][form="${formId}"]`)).toBeVisible()
    await shot(page, `settings-edit-${formId}`)
    const field = FOCUS[formId]
    if (field) {
      await page.locator(`form#${formId} input[name="${field}"]`).focus()
      await shot(page, `settings-edit-${formId}-${field}-focused`)
    }
  })
}

test("settings-export-dialog", async ({ page }) => {
  await page.goto("/settings")
  await page.getByRole("button", { name: "dreamjournal.pdf" }).click()
  await expect(page.locator(".MuiDialog-root")).toBeVisible()
  await shot(page, "settings-export-dialog")
})

test("settings-delete-account-dialog", async ({ page }) => {
  await page.goto("/settings")
  await settingsPencil(page, "user").click()
  await page.getByRole("button", { name: /Delete account/ }).click()
  await expect(page.locator(".MuiDialog-root")).toBeVisible()
  await shot(page, "settings-delete-account-dialog")
})
```

- [ ] **Step 4: Run** `yarn test:visual:update -- --project w320 --project w900 dreams search-symbols settings` — all pass. Eyeball `dreams-card-edit.png` (card is edge-to-edge, `-mx-4`) and `settings-edit-symbols.png` (scaled toggle grid) at w320.

### Task 6: Stats and header snapshots

**Files:**

- Create: `test/visual/stats.visual.test.ts`
- Create: `test/visual/header.visual.test.ts`

- [ ] **Step 1: `stats.visual.test.ts`**

```ts
import { expect, Page, test } from "@playwright/test"
import { daysFromSeed, prepare, setCheckboxSetting, shot } from "./helpers"

// the seeded dreams are 1–9 days old at seed time; "all" shows them whatever the default range is
async function openStats(page: Page, range: "all" | "month" = "all") {
  await prepare(page)
  await page.addInitScript(
    (value) => window.sessionStorage.setItem("dreamingsheep.stats.range", value),
    range
  )
  await page.goto("/stats")
  await expect(page.locator(".chart-card svg").first()).toBeVisible({ timeout: 60_000 })
}

test("stats-all", async ({ page }) => {
  await openStats(page)
  await shot(page, "stats-all")
})

test("stats-month-default", async ({ page }) => {
  await openStats(page, "month")
  await shot(page, "stats-month-default")
})

test("stats-custom-range", async ({ page }) => {
  await openStats(page)
  await page.locator('.MuiToggleButtonGroup-root button[value="custom"]').click()
  await expect(page.locator(".MuiCollapse-entered").first()).toBeVisible()
  await shot(page, "stats-custom-range")
  await page.locator('button[aria-label^="Choose date"]').first().click()
  await expect(page.locator(".MuiPickersPopper-root")).toBeVisible()
  await shot(page, "stats-custom-range-picker-open")
})

test.describe.serial("with bedtime tracking and advanced charting switched on", () => {
  const toggle = async (browser: import("@playwright/test").Browser, on: boolean) => {
    const { baseURL, storageState } = test.info().project.use
    const page = await browser.newPage({ baseURL, storageState })
    await setCheckboxSetting(page, "bedtime", on)
    await setCheckboxSetting(page, "advanced-charting", on)
    await page.close()
  }
  test.beforeAll(async ({ browser }) => toggle(browser, true))
  test.afterAll(async ({ browser }) => toggle(browser, false))

  test("stats-advanced", async ({ page }) => {
    await openStats(page)
    await shot(page, "stats-advanced")
  })

  test("stats-advanced-panel-open", async ({ page }) => {
    await openStats(page)
    await page.getByRole("button", { name: /Advanced/ }).click()
    await expect(page.locator("#advanced-stats-panel.MuiCollapse-entered")).toBeVisible()
    await shot(page, "stats-advanced-panel-open")
  })

  test("stats-sleep-chart-smooth", async ({ page }) => {
    await openStats(page)
    await page.getByLabel("smooth").check()
    await shot(page, "stats-sleep-chart-smooth")
  })

  test("dreams-sleep-form", async ({ page }) => {
    await prepare(page)
    await page.goto(`/dreams?date=${daysFromSeed(-1)}`)
    await shot(page, "dreams-sleep-form")
  })

  test("settings-both-on", async ({ page }) => {
    await prepare(page)
    await page.goto("/settings")
    await shot(page, "settings-both-on")
  })
})
```

- [ ] **Step 2: `header.visual.test.ts`**

```ts
import { expect, test } from "@playwright/test"
import { prepare, seedDate, shot, width } from "./helpers"

test.beforeEach(async ({ page }) => {
  await prepare(page)
})

test("header-mobile-menu-open", async ({ page }) => {
  test.skip(width(page) >= 900, "the mobile menu only exists below md")
  await page.goto(`/dreams?date=${seedDate()}`)
  await page.getByRole("button", { name: "Menu" }).click()
  await expect(page.locator("header .MuiCollapse-entered")).toBeVisible()
  await shot(page, "header-mobile-menu-open")
})

test("header-account-menu-open", async ({ page }) => {
  test.skip(width(page) < 900, "the account dropdown only exists from md")
  await page.goto(`/dreams?date=${seedDate()}`)
  await page.locator('[aria-label="Account of current user"]').click()
  await expect(page.locator("#menu-appbar .MuiMenu-paper")).toBeVisible()
  await shot(page, "header-account-menu-open")
})

test("header-search-focused", async ({ page }) => {
  test.skip(width(page) < 900, "the header search field is inside the collapsed menu below md")
  await page.goto(`/dreams?date=${seedDate()}`)
  await page.locator('header input[placeholder="Search..."]').focus()
  await shot(page, "header-search-focused")
})
```

- [ ] **Step 3: Run** `yarn test:visual:update -- --project w599 --project w1200 stats header` — passes; afterwards `/settings` shows both checkboxes OFF again (the `afterAll` restore).

### Task 7: Computed-style contracts, README, docs, BASELINES, commit (M0 done)

**Files:**

- Create: `test/visual/contracts.visual.test.ts`
- Create: `test/visual/README.md`
- Modify: `src/CLAUDE.md` (Testing section), `.claude/skills/verify/SKILL.md` (Gotchas)

- [ ] **Step 1: `contracts.visual.test.ts`** — the things pixels can miss, asserted per viewport. Expected values are the ones the current code produces (v3); Task 10 says which ones are allowed to change.

```ts
import { expect, Page, test } from "@playwright/test"
import { prepare, seedDate, settle, width } from "./helpers"

const css = (page: Page, selector: string, property: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((element, prop) => getComputedStyle(element).getPropertyValue(prop), property)

test.beforeEach(async ({ page }) => {
  await prepare(page)
})

test("body background switches at the sm edge (600px)", async ({ page }) => {
  await page.goto("/blog")
  await settle(page)
  const image = await css(page, "body", "background-image")
  if (width(page) >= 600) {
    expect(image).toContain("background-canvas-progressive.jpg")
    expect(await css(page, "body", "background-attachment")).toBe("fixed")
  } else {
    expect(image).toContain("background-canvas-mobile-progressive-double-height.jpg")
    expect(await css(page, "body", "background-size")).toBe("600px 1920px")
  }
})

test("MUI Container is fluid, then fixed at lg (1200px)", async ({ page }) => {
  await page.goto("/blog")
  await settle(page)
  const box = (await page.locator(".MuiContainer-root").first().boundingBox())!
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
  expect(box.width).toBe(Math.min(1200, clientWidth))
  expect(await css(page, ".MuiContainer-root", "padding-left")).toBe(
    width(page) >= 600 ? "24px" : "16px"
  )
})

test("xsmax (≤ 320px, INCLUSIVE) rules", async ({ page }) => {
  await page.goto(`/dreams?date=${seedDate()}`)
  await settle(page)
  // the calendar bleeds edge-to-edge on the smallest phones
  expect(await css(page, ".xsmax\\:-mx-8", "margin-left")).toBe(
    width(page) <= 320 ? "-32px" : "0px"
  )
  if (width(page) < 900) {
    await page.getByRole("button", { name: "Menu" }).click()
    await settle(page)
    const title = (await page.locator('img[alt="logo-title"]').boundingBox())!
    expect(title.width).toBe(width(page) <= 320 ? 160 : 216)
  }
})

test("header collapses below md (900px)", async ({ page }) => {
  await page.goto(`/dreams?date=${seedDate()}`)
  await settle(page)
  const collapse = page.locator("header .MuiCollapse-root")
  const menu = page.getByRole("button", { name: "Menu" })
  if (width(page) >= 900) {
    await expect(collapse).toHaveClass(/MuiCollapse-entered/)
    await expect(menu).toBeHidden()
  } else {
    await expect(collapse).not.toHaveClass(/MuiCollapse-entered/)
    await expect(menu).toBeVisible()
  }
})

test("card, button and toggle-grid animations keep their transitions", async ({ page }) => {
  await page.goto("/settings")
  await settle(page)
  // transition-property comes from the custom utility, the 300ms duration from MUI's Paper rule
  expect(await css(page, "form#user .MuiCard-root", "transition-property")).toBe("margin")
  expect(await css(page, "form#user .MuiCard-root", "transition-duration")).toBe("0.3s")
  await page.locator("form#user button.MuiIconButton-root").click()
  await settle(page)
  const update = 'button[type="submit"][form="user"]'
  expect(await css(page, update, "transition-property")).toBe("all")
  expect(await css(page, update, "transition-duration")).toBe("0.3s")
  expect(await css(page, update, "transition-timing-function")).toBe("cubic-bezier(0.4, 0, 0.2, 1)")
  const grid = "form#symbols .transition-transform"
  expect(await css(page, grid, "transition-property")).toBe("transform")
  expect(await css(page, grid, "transition-duration")).toBe("0.15s")
})

test("toggle-button overrides (index.css today, Theme.ts after M2)", async ({ page }) => {
  await page.goto("/settings")
  await settle(page)
  expect(await css(page, ".MuiToggleButtonGroup-root", "border-left")).toBe(
    "1px solid rgb(224, 224, 224)"
  )
  expect(await css(page, ".MuiToggleButtonGroup-root", "padding-top")).toBe("1px")
  const grouped = ".MuiToggleButtonGroup-grouped"
  expect(await css(page, grouped, "min-width")).toBe("86px")
  expect(await css(page, grouped, "min-height")).toBe("76px")
  expect(await css(page, grouped, "text-transform")).toBe("lowercase")
  expect(await css(page, grouped, "font-size")).toBe("14px")
  expect(await css(page, grouped, "margin-top")).toBe("-1px")
})

test("stats range toggles shrink below sm (600px)", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("dreamingsheep.stats.range", "all"))
  await page.goto("/stats")
  await settle(page)
  const all = '.MuiToggleButtonGroup-root button[value="all"]'
  // NB: as built this asserts a constant "48px" and the 7px/11px padding switch instead — see "M0 as built" finding 1
})

test("no hover utility is gated behind @media (hover: hover)", async ({ page }) => {
  await page.goto("/blog")
  await settle(page)
  const gated = await page.evaluate(() => {
    let count = 0
    const walk = (rules: CSSRuleList) => {
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSMediaRule && /\(hover:\s*hover\)/.test(rule.conditionText)) count++
        if ("cssRules" in rule) walk((rule as CSSGroupingRule).cssRules)
      }
    }
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        walk(sheet.cssRules)
      } catch {
        /* cross-origin sheet */
      }
    }
    return count
  })
  expect(gated).toBe(0)
})

test.describe("visitor", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("login fields are glued: 1px overlap, no radius on the joint, focused outline on top", async ({
    page,
  }) => {
    await page.goto("/")
    await settle(page)
    const email = page.locator(".MuiOutlinedInput-root", {
      has: page.locator('input[name="email"]'),
    })
    const password = page.locator(".MuiOutlinedInput-root", {
      has: page.locator('input[name="password"]'),
    })
    const emailBox = (await email.boundingBox())!
    const passwordBox = (await password.boundingBox())!
    expect(passwordBox.y).toBe(emailBox.y + emailBox.height - 1)
    expect(await email.evaluate((el) => getComputedStyle(el).borderBottomLeftRadius)).toBe("0px")
    expect(await password.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe("0px")
    await page.locator('input[name="password"]').focus()
    const outline = password.locator(".MuiOutlinedInput-notchedOutline")
    expect(await outline.evaluate((el) => getComputedStyle(el).borderColor)).toBe(
      "rgb(0, 188, 212)"
    )
    expect(await outline.evaluate((el) => getComputedStyle(el).borderWidth)).toBe("2px")
  })
})
```

- [ ] **Step 2: Run the contracts on `main`'s code**: `yarn test:visual -- contracts` — every test passes at every viewport. A failing expectation here means the value written above does not match today's rendering: measure the real value in the report/trace, correct the expectation (these are contracts about TODAY), never the code.

- [ ] **Step 3: `test/visual/README.md`**

```markdown
# Visual regression suite (Playwright)

Pixel-for-pixel snapshots of every page state across every breakpoint edge (320/321, 375, 599/600,
899/900, 1199/1200 — see `playwright.config.ts`). Built for issue #1 (Tailwind v4 + `sx` removal):
baselines are taken BEFORE a styling change and compared after it.

## Run

1. Seeded local DB (`npm run db:seed`, docker postgres) and a PRODUCTION build on :3000
   (`nvm use 22 && yarn build && yarn start`), or `VISUAL_BASE_URL=…`. Dev output differs (Tailwind
   emits nested CSS in dev, the prod build flattens it) — never mix modes.
2. Baseline: `VISUAL_SEED_DATE=<day you seeded, YYYY-MM-DD> yarn test:visual:update`
3. Compare: `yarn test:visual`, then `yarn test:visual:report`.

Baselines live in `__snapshots__/` (gitignored, ~0.5–1 GB, photo backgrounds). `meta.json` there
records the frozen clock date and the capture mode so compare runs match. Do not re-seed between
baseline and compare. Partial runs: `yarn test:visual -- --project w320 -g "settings-edit"`.

## Triage

Diffs are real until proven otherwise. Fix the code, or — if the change is intended and the
maintainer approved it — re-baseline THAT test only: `yarn test:visual:update -- -g "<name>"`.

## Determinism

Login once via `global-setup.ts` (storage state), `page.clock.setFixedTime` (10:00 on the seed day,
Europe/Budapest), third parties blocked (analytics, reCAPTCHA), cookie notice pre-acknowledged,
home-page counters masked, `animations: "disabled"` + a 700ms settle for MUI transitions,
`maxDiffPixels: 0`. `stats.visual.test.ts` toggles two settings on and restores them
(`global-setup.ts` resets them if a run died midway).

## Capture mode

Default `fullpage` uses Chromium's captureBeyondViewport. If a full-page PNG shows the sticky AppBar
stretched or floating (a puppeteer-era artefact, see `.claude/skills/verify/SKILL.md`), re-baseline
with `VISUAL_CAPTURE=tall`, which resizes the viewport to the document height instead.
```

- [ ] **Step 4: Docs** — `src/CLAUDE.md` Testing section, add a bullet after the E2E one:

```markdown
- **Visual** (`npm run test:visual`, Playwright, config `test/visual/playwright.config.ts`):
  full-page `toHaveScreenshot` at every breakpoint edge (320/321, 375, 599/600, 899/900,
  1199/1200) plus computed-style contracts; baselines are local (gitignored). Needs a running
  PRODUCTION build + seeded DB; see `test/visual/README.md`. Any styling PR runs it before/after.
```

`.claude/skills/verify/SKILL.md`, add under Gotchas: `- For layout/styling changes prefer the Playwright visual suite (`npm run test:visual`, test/visual/README.md) over ad-hoc puppeteer screenshots — it already freezes time, masks live counters and covers the breakpoint edges.`

- [ ] **Step 5: Generate the full baseline** (prod build of this commit, ~40 states × 9 widths, 20–30 min):

```bash
VISUAL_SEED_DATE=<seed day> yarn test:visual:update
yarn test:visual                       # a second run against its own baselines must be 100% green
```

If the second run is not fully green, the flaky test is fixed (longer waits, extra mask) before continuing — a flaky baseline is worthless. Open `__snapshots__/w320/public.visual.test.ts/blog-off-the-charts.png` and `__snapshots__/w1200/dreams.visual.test.ts/dreams-list.png`: the AppBar must appear once, at the top. If not, re-run both commands with `VISUAL_CAPTURE=tall`.

- [ ] **Step 6: Commit M0**

```bash
npm run lint && npm run type:check && npm test
git add package.json yarn.lock .gitignore test/visual src/CLAUDE.md .claude/skills/verify/SKILL.md
git commit -m "test(visual): playwright snapshot suite across every breakpoint edge (#1)"
```

## M0 as built (2026-09-12) — deviations and findings

The harness landed as planned; these differences and discoveries came out of building it, and the
later milestones depend on them.

**Deviations (all maintainer-approved during implementation)**

- **The captures strip the body background photos.** `freeze.css` adds
  `body { background-image: none !important }`, leaving the `#0097a7` ground. A light page drops
  from ~1.9 MiB to ~0.16 MiB, and diffs stop drowning in JPEG noise. The breakpoint switch between
  the mobile and cover photo pairs is asserted in `contracts.visual.test.ts` instead.
- **Every feature is opted in.** `global-setup.ts` switches `bedtime` and `advanced-charting` **on**
  for the demo user, so nothing hides behind a setting. One serial block borrows
  `advanced-charting` back for a shot of the static chart grid. The suite leaves both on.
- **One blog article, not two** — every article shares the same layout.
- **The shot set was trimmed to 31 states** (maintainer-picked, 23 removed). Visual testing guards
  layout, not functionality, and the app repeats a handful of layouts: a bare landing/signup page is
  covered by a richer shot of itself, a bare dream list/edit card/create form by its "More" variant,
  every focused-field state by signup's glued password pair, the read-only settings page by any
  `settings-edit-*` shot, and the stats chart grid by both remaining stats shots. Roughly halves the
  runtime and the disk footprint.
- **Added states**: `dreams-card-edit-more` (the "More" panel inside an edit card, where the
  container is 2 rem narrower than in the create form), `settings-opted-out`, `stats-static-charts`.
- **Added tooling**: `test/visual/make-index.mjs` + `npm run test:visual:index` builds a contact
  sheet (`__snapshots__/index.html`, one row per state, one column per width) for eyeballing the
  matrix.
- **`meta.json` semantics**: a stored run parameter always beats "today", including on
  `--update-snapshots` runs. Only an explicit `VISUAL_SEED_DATE` / `VISUAL_CAPTURE` re-records it,
  so an update run can never silently re-date a baseline. This machine's database was seeded on
  **2026-02-07** (dreams at −1, −2, −3, −7, −9 days).
- `verify-user` is not snapshotted (it fires a mutation on mount).

**Findings that the later milestones must respect**

1. **The stats range buttons are 48 px wide at every width.**
   `sx={{ minWidth: { xs: "48px !important", sm: "86px" } }}` marks the `xs` value important, which
   outranks the `sm` media rule everywhere, so the `86px` is dead (the `px` switch at `sm` does
   work: 7 px → 11 px). Pre-existing; **preserve it**. `min-w-[48px]! sm:min-w-[86px]` reproduces it
   exactly, because an important declaration beats a plain one whatever the media query. Fixing it
   is a separate, deliberate decision — `contracts.visual.test.ts` pins the current behaviour.
2. **The dreams page races its own `?date=`.** An effect in `src/pages/dreams/index.tsx` pushes
   `?date=<today>` before the router hydrates the query string, so a deep link can be overwritten.
   The suite works around it with `gotoDreamsDay()` (freeze the clock on the wanted day, load a bare
   `/dreams`). Not fixed here — out of scope for a styling migration, worth its own issue.
3. **Animated GIFs never settle.** `animations: "disabled"` stops CSS animations, not GIF frames;
   `public/assets/blog-dna.gif` made the blog index fail the two-consecutive-captures check.
   `shot()` masks `img[src*=".gif"]` everywhere.
4. **Background shorthands compute per layer** — two layers means `background-size: "cover, cover"`,
   `background-attachment: "fixed, fixed"`. Contracts assert the pair.
5. `npm run type:check` is at **0 errors** on this branch (the ~58 `noImplicitAny` errors in the
   plan's constraints only appear if that flag is turned on, which it is not). Keep it at 0.
6. **Two more sources of flake, both fixed in the harness** (found by running the full matrix
   twice against unchanged code — the only honest way to prove a baseline is reproducible):
   a click leaves the pointer on what it hit and MUI paints a hover overlay there
   (`rgba(primary, 0.04)`), which appeared or not depending on how the layout moved afterwards —
   `shot()` now parks the pointer at (-1, -1) first; and a dialog is `position: fixed`, so a
   full-page capture paints it at whatever the scroll offset happens to be, while clicking an
   opener auto-scrolls it into view — `openDialog()` settles the layout and scrolls to the top
   first, making that offset a pure function of the layout. Three consecutive compare runs of the
   affected specs then passed.
7. **The footer tagline is random for logged-in users.** `src/core/layouts/Footer.tsx` picks one of
   twelve quotes with `Math.random()` (anonymous visitors always get "Long time no sleep?™"), and
   they differ in length and line count, so every authenticated page's height moved between runs.
   `prepare()` pins `Math.random` to 0 in the page, which selects that same single-line tagline.
   Safe: the only other `Math.random()` in the codebase generates OTP codes, server-side. This is
   why the first full compare failed on the dreams specs — worth knowing before blaming a CSS
   change for a diff that is really a moving footer.
8. **First bug the harness caught** (fixed in the same milestone, commit `fix(blog): …`): the blog
   index overflowed its 320/321 px viewport — every card rendered 335 px wide and was clipped by
   the layout's `overflow-x: hidden`. Cause: the open-source post's excerpt contains the bare URL
   `https://github.com/talpitoo/dreamingsheep`, and an unbreakable 41-character word sets the
   min-content width of the MUI Grid item, which a flex item never shrinks below. Fix:
   `className="[overflow-wrap:anywhere]"` on the excerpt `Typography` in `src/pages/blog/index.tsx`.
   **`break-words` does not work here** — `overflow-wrap: break-word` breaks at layout time only and
   does not reduce the intrinsic min-content size; only `anywhere` does (measured both). The
   remaining content pages were swept at 320/321 and are clean.

---

### Task 8: Tailwind 4.1.18 pipeline + CSS entry + cascade layers (single commit — M1)

**Files:**

- Modify: `package.json`, `yarn.lock`
- Modify: `postcss.config.js`
- Delete: `tailwind.config.js`
- Rewrite: `src/styles/index.css`
- Modify: `src/createEmotionCache.ts`
- Modify: `src/pages/_document.tsx:22-38`
- Modify: `src/core/layouts/Header.tsx:128,306`, `src/core/components/SymbolsRadioList.tsx:117`

**Interfaces:**

- Produces: the layer order `theme, base, mui, components, utilities` (consumed by `layers.visual.test.ts`, Task 10), `@custom-variant xsmax`, `@custom-variant hover`, `@utility` classes (`transition-margin`, `line-clamp`, `pre-wrap`, `grid-spacer-md-2`, `grid-spacer-md-3`, `min-h-screen-minus-header`), theme colours `mui-primary`, `mui-secondary`, `mui-secondary-light`, `bg-canvas-blue`.

- [ ] **Step 1: Record the type-check baseline** `npm run type:check 2>&1 | tail -1` → note the error count.

- [ ] **Step 2: Swap the dependencies** (why by hand and not `npx @tailwindcss/upgrade`: the codemod installs the latest 4.3.x and rewrites 100+ files with its own formatting; the surface here is three class renames and one CSS file)

```bash
nvm use 22
yarn remove autoprefixer postcss
yarn add --exact tailwindcss@4.1.18 @tailwindcss/postcss@4.1.18
git rm tailwind.config.js
```

`package.json` `dependencies` now has `"@tailwindcss/postcss": "4.1.18"` and `"tailwindcss": "4.1.18"`, and no `autoprefixer`/`postcss`.

- [ ] **Step 3: `postcss.config.js`**

```js
// postcss.config.js — Tailwind v4 vendor-prefixes for its own targets (Lightning CSS), so
// autoprefixer is gone. Next.js reads this file for both Turbopack and webpack builds.
module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
}
```

- [ ] **Step 4: Rewrite `src/styles/index.css`.** Everything from line 5 (`@layer base {`) to line 187 (end of `@layer components`) is kept byte-identical except where noted; the new parts are the header, the `@theme`/`@custom-variant` block, the `@variant sm` body rule (was `@screen sm`), the `a` rule (`!important` → `!`), the formerly-unlayered `.Mui*` rules moved INTO `@layer components`, and the `@utility` blocks (were `@layer utilities`). Full file:

```css
/* Tailwind CSS v4 entry — docs/superpowers/plans/2026-09-11-tailwind-v4-migration.md (issue #1).
   The layer order below is the FIRST layer statement the browser parses (this file is the first
   stylesheet; src/pages/_document.tsx repeats it inline ahead of the emotion tags), so `mui` — MUI's
   emotion output, wrapped in src/createEmotionCache.ts — sits between base and components:
   utilities beat MUI, MUI beats our base rules, exactly the precedence `important: "#__next"` gave
   us under Tailwind v3, minus the #__next scoping (utilities now also reach MUI portals). */
@layer theme, base, mui, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
/* no "tailwindcss/preflight.css": MUI's <CssBaseline /> stays the reset (was corePlugins.preflight: false) */
@import "tailwindcss/utilities.css" layer(utilities);

@theme {
  /* Tailwind screens = MUI's default breakpoints (createTheme().breakpoints.values), so `sm:` and a
     future `{ sm: … }` switch at the same width. xl/2xl keep Tailwind's defaults (unused). */
  --breakpoint-sm: 600px;
  --breakpoint-md: 900px;
  --breakpoint-lg: 1200px;
  /* palette mirrored from src/styles/Theme.ts (MUI 5 cannot emit CSS variables; keep both in sync) */
  --color-mui-primary: #e84122;
  --color-mui-secondary: #e6e5e5;
  --color-mui-secondary-light: #f5f5f5;
  --color-bg-canvas-blue: #0097a7;
  /* v4 moved the default palette to oklch; pin the v3 hex so text-gray-400 stays byte-identical */
  --color-gray-400: #9ca3af;
}

/* v3 `xsmax: { max: "320px" }` was INCLUSIVE (≤ 320, the 320px phones); v4's max-* variants are
   exclusive, so the variant is defined by hand */
@custom-variant xsmax (@media (width <= 320px));
/* v3 applied hover on touch devices too; v4 gates it behind @media (hover: hover). Keep v3. */
@custom-variant hover (&:hover);

@layer base {
  /* … lines 6–39 of the v3 file, unchanged … */
}

@layer components {
  html {
    scroll-behavior: smooth;
  }

  body {
    scroll-behavior: smooth;
    background-color: #0097a7 !important; /* cyan[500] = #00bcd4 */
    background-position: top left;
    background-image: url("/assets/background-canvas-mobile-progressive-double-height.jpg"),
      url("/assets/background-canvas-mobile-blur-double-height.jpg");
    /* NOTE: old: background-size: 100% 200vh; new: to avoid mobile keyboard resize */
    background-size: 600px 1920px;
  }

  /* was `@screen sm` */
  @variant sm {
    body {
      background-image: url("/assets/background-canvas-progressive.jpg"),
        url("/assets/background-canvas-blur.jpg");
      background-size: cover;
      background-repeat: no-repeat;
      background-attachment: fixed;
    }
  }

  a {
    @apply text-mui-primary;
    @apply no-underline!;
    @apply hover:underline!;
    /* TODO @talpitoo find a better way for global text links */
  }

  /* … .ratio … .hero … @keyframes rotation … .loading-spiral … .heading … .footer-stripe …
     .title … .description … .account-dropdown — lines 74–186 of the v3 file, unchanged … */

  /* Formerly unlayered (v3 lines 189–265). In the components layer they keep beating MUI
     (mui < components) and keep losing to utilities (components < utilities) — the same outcome
     they had under `important: "#__next"`. The toggle-button block moves to Theme.ts in M2. */
  /* TODO @talpitoo This should be theme overrides and not done through pure css. Docs: https://mui.com/customization/theming/ */
  .MuiToggleButtonGroup-root {
    border-left: 1px solid #e0e0e0;
    padding-top: 1px;
    overflow: hidden;
  }
  /* … .MuiToggleButtonGroup-grouped, :first-child, :last-child, .MuiModal-root .temporary-img-fix,
     .chart-card .MuiContainer-maxWidthLg, .text-outline label (+ .Mui-focused, .MuiFormLabel-filled),
     .image-upload-label, .image-upload-fullwidth > div, .image-upload-fullwidth img,
     .MuiPickerStaticWrapper-content, header .MuiOutlinedInput-notchedOutline — v3 lines 196–265,
     unchanged, including their !important flags … */
}

/* were `@layer utilities` classes (v3 lines 281–314) */
@utility transition-margin {
  transition-property: margin;
}

@utility line-clamp {
  overflow: hidden;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  display: -webkit-box;
}

@utility pre-wrap {
  white-space: pre-wrap;
}

/* for the empty offset columns (<Grid item md={2} className="grid-spacer-md-2" />): MUI sizes grid
   items with flex-basis alone, and ancient WebKits size an EMPTY flex item from its content — 0px —
   so the spacer vanishes and the row shifts left. An explicit percentage width is understood by
   every engine as the fallback basis, and modern flexbox ignores it in favor of the identical
   flex-basis, so nothing changes on current browsers. */
@utility grid-spacer-md-2 {
  @apply md:w-2/12;
}

@utility grid-spacer-md-3 {
  @apply md:w-3/12;
}

@utility min-h-screen-minus-header {
  min-height: calc(100vh - 80px);
}
```

Delete the commented-out `#recaptcha-wrapper` block (v3 lines 267–279, dead). `src/styles/fonts.css` and `public/styles/noscript.css` are untouched.

- [ ] **Step 5: `src/createEmotionCache.ts`**

```ts
import createCache from "@emotion/cache"
import type { EmotionCache } from "@emotion/react"

const isBrowser = typeof document !== "undefined"

// On the client side, Create a meta tag at the top of the <head> and set it as insertionPoint.
// This assures that MUI styles are loaded first.
// It allows developers to easily override MUI styles with other styling solutions, like CSS modules.
//
// Every rule emotion emits is wrapped in `@layer mui { … }` — the same lines
// @mui/styled-engine's <StyledEngineProvider enableCssLayer> uses (5.18+), applied to OUR cache so
// the server-side extraction in src/pages/_document.tsx emits layered CSS too. The layer order is
// declared in src/pages/_document.tsx and src/styles/index.css (issue #1).
export default function createEmotionCache(): EmotionCache {
  let insertionPoint

  if (isBrowser) {
    const emotionInsertionPoint = document.querySelector<HTMLMetaElement>(
      'meta[name="emotion-insertion-point"]'
    )
    insertionPoint = emotionInsertionPoint ?? undefined
  }

  const cache = createCache({ key: "mui-style", insertionPoint })
  const prevInsert = cache.insert
  cache.insert = (...args: Parameters<EmotionCache["insert"]>) => {
    const serialized = args[1]
    // a bare `@layer a, b;` statement must not be nested
    if (!serialized.styles.match(/^@layer\s+[^{]*$/)) {
      serialized.styles = `@layer mui {${serialized.styles}}`
    }
    return prevInsert(...args)
  }
  return cache
}
```

- [ ] **Step 6: `src/pages/_document.tsx`** — make the layer statement the FIRST child of `<Head>` (Next renders `<Head>` children before its CSS links; the emotion tags follow the insertion point):

```tsx
<Head>
  {/* the cascade-layer order must be the first layer statement the browser parses: before
            the emotion tags below (MUI output lives in `@layer mui`, see src/createEmotionCache.ts)
            and before the Tailwind stylesheet, which repeats the same statement (issue #1) */}
  <style>{"@layer theme, base, mui, components, utilities;"}</style>
  {/* PWA primary color */}
  {/* <meta name="theme-color" content={Theme.palette.primary.main} /> */}
  <meta name="theme-color" content="#0097a7" />
  …unchanged…
  <meta name="emotion-insertion-point" content="" />
  {emotionStyleTags}
</Head>
```

- [ ] **Step 7: The three class renames**

  - `src/core/layouts/Header.tsx:128`: `className="flex-grow mr-8"` → `className="grow mr-8"`
  - `src/core/layouts/Header.tsx:306`: `className="hover:!no-underline"` → `className="hover:no-underline!"`
  - `src/core/components/SymbolsRadioList.tsx:117`: `rounded-md shadow bg-white` → `rounded-md shadow-sm bg-white` (v4 renamed `shadow` → `shadow-sm`, same value)

- [ ] **Step 8: Safety grep for anything the census missed** (all must print nothing):

```bash
grep -rnE "(^|[\"' \`])(flex-grow|flex-shrink|overflow-ellipsis|decoration-(slice|clone)|bg-opacity-|text-opacity-|border-opacity-|ring-opacity-|placeholder-opacity-|divide-opacity-|space-[xy]-|outline-none|bg-gradient-to-)" src --include=*.tsx --include=*.ts --include=*.css
grep -rnE "[\"' ](hover|focus|sm|md|lg|xsmax):![a-z]" src --include=*.tsx      # old ! prefix syntax
grep -rn "@tailwind\|@screen\|theme(" src/styles                                 # v3 directives
grep -rn "__next" src --include=*.css                                             # the old scoping
```

- [ ] **Step 9: Build both ways and inspect the CSS head**

```bash
yarn build 2>&1 | tail -5                              # no errors
CSS=$(find .next/static -name "*.css" | head -1); head -c 400 "$CSS"; echo
grep -o "@layer [a-z, ]*;" "$CSS" | head -3            # first: "@layer properties;" then "@layer theme, base, mui, components, utilities;"
grep -c "#__next" "$CSS"                               # 0
grep -o "width <= 320px\|max-width: 320px" "$CSS" | head -2   # the inclusive xsmax
```

Then `yarn dev` briefly and open http://localhost:3000/blog: buttons, cards and the header look as before (dev ships nested CSS; Chrome 120+ renders it).

- [ ] **Step 10: Type-check and lint** `npm run type:check 2>&1 | tail -1` (count ≤ Step 1), `npm run lint`, `npm test`.

Do not commit yet — Task 9 and 10 finish M1 in the same commit.

### Task 9: Portal audit — classes that were inert under `#__next` scoping

**Files:**

- Modify: `src/core/components/DeletionConfirmationDIalog.tsx:78-87`
- Modify: `src/dreams/components/CreateInstantSymbolDialog.tsx:79-86`
- Review only: `src/core/layouts/Header.tsx` (Menu), `src/dreams/components/SymbolsAutocomplete.tsx` (listbox), `src/settings/components/ExportDreams/index.tsx` (dialog), `src/sleepingTimes/components/SleepingTimeForm.tsx` (Snackbar), `src/core/components/IconWithUsage/*` (Tooltip)

Under layers every `className` inside portaled MUI content starts to apply. Parity means: whatever was inert must stay visually inert, or be removed.

- [ ] **Step 1: Delete dialog** — `max-w-[89px]` would now clip "Yes, Delete Account". The width animation never ran in dialogs, so remove the inert bits and keep the rest:

```tsx
<Button
  variant="contained"
  onClick={handleDelete}
  disabled={isBusy}
  className="w-auto"
  endIcon={isBusy && <HourglassTopIcon className="opacity-50" />}
  sx={{ ml: 2 }}
>
  {deleteButton}
</Button>
```

- [ ] **Step 2: Instant-symbol dialog** — same treatment at lines 81–83: the submit button keeps `className="w-auto"`, the `transition-all … max-w-[…]` template goes.

- [ ] **Step 3: `temporary-img-fix`** — `DeletionConfirmationDIalog.tsx:70` `className="temporary-img-fix w-full h-auto max-w-[300px]"` now applies the same values as the `.MuiModal-root .temporary-img-fix` rule; nothing to change here (the rule is deleted in Task 20 once the snapshot proves the utilities carry it).

- [ ] **Step 4: Review the other portals** — `grep -n "className=" ` in the five files above: Header Menu items and the autocomplete options use `sx`/icon classes only (icon-font classes are unlayered `fonts.css`, unaffected); the export dialog, Snackbar toast (`flex items-center gap-2`, `h-5 w-5 text-lg`) and tooltip content gain nothing beyond already-intended layout. Record each file with "no change" or the change in the PR description.

### Task 10: M1 verification — layer contracts, prefix diff, snapshots, e2e, commit

**Files:**

- Create: `test/visual/layers.visual.test.ts`
- Modify: `test/visual/contracts.visual.test.ts` (one expectation, see Step 4)

- [ ] **Step 1: `layers.visual.test.ts`**

```ts
import { expect, test } from "@playwright/test"
import { daysFromSeed, prepare, settle } from "./helpers"

test("cascade order is theme, base, mui, components, utilities and MUI lives in @layer mui", async ({
  page,
}) => {
  await prepare(page)
  await page.goto(`/dreams?date=${daysFromSeed(-1)}`)
  await settle(page)
  const info = await page.evaluate(() => {
    const statements: string[] = []
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules)) {
          if (rule.constructor.name === "CSSLayerStatementRule") {
            statements.push(
              Array.from((rule as unknown as { nameList: string[] }).nameList).join(", ")
            )
          }
        }
      } catch {
        /* cross-origin sheet */
      }
    }
    // emotion inserts via CSSOM in production (speedy), so read the sheets, not textContent
    const emotion = Array.from(
      document.querySelectorAll<HTMLStyleElement>("style[data-emotion]")
    ).flatMap((element) =>
      Array.from(element.sheet?.cssRules ?? []).map(
        (rule) => `${rule.constructor.name}:${(rule as unknown as { name?: string }).name ?? ""}`
      )
    )
    return { statements, emotion }
  })
  expect(info.statements[0]).toBe("theme, base, mui, components, utilities")
  expect(info.emotion.length).toBeGreaterThan(0)
  for (const rule of info.emotion) expect(rule).toBe("CSSLayerBlockRule:mui")
  // a utility beats MUI's own component style without !important
  const padding = await page
    .locator(".MuiCardActions-root.p-4")
    .first()
    .evaluate((element) => getComputedStyle(element).paddingTop)
  expect(padding).toBe("16px")
})
```

- [ ] **Step 2: Vendor-prefix diff** (what autoprefixer's removal changed):

```bash
# on main (git stash / worktree), after yarn build:
find .next/static -name "*.css" -exec cat {} + | grep -oE "\-(webkit|moz|ms|o)-[a-z-]+" | sort | uniq -c | sort -nr > /tmp/prefixes-main.txt
# on the branch, after yarn build:
find .next/static -name "*.css" -exec cat {} + | grep -oE "\-(webkit|moz|ms|o)-[a-z-]+" | sort | uniq -c | sort -nr > /tmp/prefixes-tw4.txt
diff /tmp/prefixes-main.txt /tmp/prefixes-tw4.txt
```

The hand-written `-webkit-box-decoration-break`, `-webkit-line-clamp`, `-webkit-box-orient`, `-webkit-font-smoothing` must still be present. Paste the diff into the PR description.

- [ ] **Step 3: Snapshots** — `yarn build && yarn start`, then `yarn test:visual`. Target: 0 diffs. Triage every diff with `yarn test:visual:report`. Expected candidates and their disposition:
  - `dreams-delete-dialog`, `dreams-instant-symbol-dialog`, `settings-delete-account-dialog`: must be identical (Task 9 removed the newly-live classes). A diff here = a portal class still live → fix.
  - Any `text-gray-400` icon tint: must be identical (pinned hex). A diff = the pin is missing.
  - `SymbolsRadioList` (`settings-edit-symbols`): `shadow-sm` equals v3 `shadow`; identical.
  - Anti-aliasing-only diffs on composited cards (`transform-gpu` now emits `translate:` + `transform: translateZ(0)`): inspect at 400%; if it is sub-pixel AA on text only, ask the maintainer whether to accept, and if accepted re-baseline THOSE tests only.
- [ ] **Step 4: Contracts** — `yarn test:visual -- contracts layers`. One expectation is allowed to change: v4's `transition-transform` is `transform, translate, scale, rotate` (was `transform`). Update that line in `contracts.visual.test.ts` with the comment `// v4: transition-transform also lists translate/scale/rotate`, after confirming `settings-edit-symbols` is snapshot-identical.
- [ ] **Step 5: e2e + the rest** — `npm run dev` (the e2e suite expects it) then `npm run test:e2e`; `npm run lint`; `npm run type:check` (≤ baseline); `npm test`.
- [ ] **Step 6: Commit M1**

```bash
git add -A
git commit -m "feat(styles): tailwind 4.1.18 + cascade layers, MUI in @layer mui (#1)"
```

## M1 as built (2026-09-12) — what the plan did not foresee

Tasks 8–10 landed, but four things had to be solved that the plan's spikes could not see, because
each only shows up in the running app rather than in a standalone Tailwind compile.

1. **Next gives the server two instances of `@emotion/react`.** Its `exports` map offers an ESM and
   a CJS build, `_app.tsx`'s import resolves to one and `@mui/styled-engine`'s to the other, so the
   `CacheProvider` in `_app` never reached MUI's components server-side: they fell back to their own
   instance's default cache, whose styles are **unlayered** and therefore outrank every utility.
   Proven by instrumenting the render — `_app` saw `cache.key === "mui-style"` while
   `cache.inserted` stayed empty and the HTML came out full of `css-*` classes. Fix:
   `<StyledEngineProvider enableCssLayer>` inside the existing `CacheProvider`. It is imported from
   MUI, i.e. from the same instance its components read, so it is the provider that lands. Both
   caches are wrapped either way, so whichever wins, the layering holds.
   _Side finding, not fixed here:_ this also means the pages-router SSR style extraction in
   `_document.tsx` has been dead since the Next 16 move — MUI's styles are emitted inline in the
   body instead of the head. Worth its own issue.
2. **Every stylesheet the app loads must be inside a layer.** `src/styles/fonts.css` and
   `swiper/css` were plain imports, and an unlayered rule beats all layered ones, so the icon font's
   `font-size: 16px` started winning over `text-2xl` and every toggle-button glyph shrank (a
   uniform 16px height loss across the forms). Both are now `@import`ed from `index.css` with
   `layer(components)`, which reproduces what they did under v3.
3. **Tailwind's internal `properties` layer has to be named, first.** It holds the `@supports`
   fallback that seeds the `--tw-*` custom properties for browsers without `@property`. A layer the
   order statement leaves out is created on first use — i.e. appended after `utilities` — which
   would let those initializers outrank the utilities that set them, on exactly the old browsers
   they exist for. The order is therefore
   `@layer properties, theme, base, mui, components, utilities`.
4. **The 404 divider that never drew.** `ErrorStatus` asks for `border-r border-current`, but v3
   sets only a border _width_ and, with Preflight disabled, the style stayed `none`. v4's border
   utilities carry their own style, so the line appeared. Removed to keep the page identical;
   restoring it is a design decision, not a migration side effect.

5. **Cascade layers wedge Chrome 105, which is what the e2e suite drives.** After the flip, every
   puppeteer navigation after the first timed out. Bisected to a minimal repro: a stylesheet
   containing a layer _statement_ (`@layer a, b;`) followed by a layer _block_
   (`@layer c { … }`) hangs that renderer on the NEXT navigation, but only once the file comes from
   the HTTP cache (`setCacheEnabled(false)` makes it go away, and so does an empty stylesheet).
   **This is a regression, not a pre-existing condition**: the live v3 site navigates fine in the
   same Chrome 105 (measured), because it has no cascade layers. The root cause is a defect in that
   browser build — the CSS is valid and modern Chromium is unaffected (the visual suite drives 153
   over the same pages) — but adopting layers is what exposes it. Chrome 105 is from August 2022 and
   sits below Tailwind v4's documented floor of Chrome 111+ / Safari 16.4+ / Firefox 128+.
   **Fixed at the source, for real users too.** The trigger needs the statement and a block in the
   SAME cached file, and the statement in `index.css` turned out to be redundant: `_document.tsx`
   declares the authoritative order inline, ahead of everything, and every layer the stylesheet uses
   gets a block of its own — so Lightning CSS was emitting a lone `@layer mui;` for the one layer
   that had none. Dropping the statement from `index.css` leaves the file with blocks only, and
   Chrome 105 navigates normally again with its cache on. The e2e suite therefore needs **no**
   workaround (all 29 pass unchanged) and keeps working as a canary for this class of breakage —
   it is the only thing in the project that drives an old browser.
   Note the block order inside the built stylesheet is then whatever Lightning CSS likes
   (properties, theme, utilities, components, base): harmless, because the inline statement has
   already fixed every layer's position, and `layers.visual.test.ts` asserts exactly that.

**Verification deviations**

- The vendor-prefix diff of Task 10 Step 2 was not produced byte-for-byte: rebuilding the v3
  toolchain needs a dependency reinstall, which would have disturbed the node_modules the visual
  suite runs from (and a worktree build fails — Turbopack rejects a symlinked `node_modules`).
  Instead the new build's prefix inventory was checked directly: every hand-written prefix survives
  (`-webkit-box-decoration-break` ×2, `-webkit-line-clamp`, `-webkit-box-orient`,
  `-webkit-font-smoothing` ×2, `-moz-osx-font-smoothing` ×2). What autoprefixer used to add beyond
  those served browsers below the v4 floor, which this migration already accepted losing.
- One contract expectation changed on purpose: v4 widens `transition-transform` to
  `transform, translate, scale, rotate`. The settings symbols grid animates through
  `transform: scale(…)`, still in the list, and its snapshots are unchanged at every width.
- `test/visual/layers.visual.test.ts` was added: the layer order, every emotion rule being inside
  `@layer mui`, a utility beating MUI without `!important`, and MUI still beating our base layer.

---

### Task 11: Theme.ts takes over the toggle-button CSS (M2)

**Files:**

- Modify: `src/styles/Theme.ts:36-90`
- Modify: `src/styles/index.css` (remove the four `.MuiToggleButtonGroup-*` rules from `@layer components`)

The `!important` flags are kept on purpose: MUI's own `grouped` rules (`:not(:first-of-type)`, `.Mui-selected + .Mui-selected`) are more specific, and inside the same `mui` layer only `!important` keeps today's outcome. Dropping them is a separate, later cleanup.

- [ ] **Step 1: Add the overrides** to `components` in `Theme.ts`, after `MuiFormLabel`:

```ts
    // moved from src/styles/index.css (issue #1). `!important` kept where the CSS had it: MUI's own
    // grouped rules are more specific and share the `mui` cascade layer.
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          borderLeft: "1px solid #e0e0e0",
          paddingTop: "1px",
          overflow: "hidden",
        },
        grouped: {
          marginTop: "-1px !important",
          minWidth: "86px",
          minHeight: "76px",
          borderColor: "#e0e0e0 !important",
          textTransform: "lowercase !important" as const,
          fontSize: "14px !important",
          lineHeight: "2 !important",
          "&:first-of-type": {
            borderBottomLeftRadius: 0,
            borderTopLeftRadius: 0,
            marginLeft: "-1px",
          },
          "&:last-of-type": {
            borderTopRightRadius: 0,
          },
        },
      },
    },
```

- [ ] **Step 2: Remove** the `.MuiToggleButtonGroup-root`, `.MuiToggleButtonGroup-grouped`, `:first-child` and `:last-child` rules (and the `TODO @talpitoo … theme overrides` comment) from `index.css`.
- [ ] **Step 3: Verify** `yarn build && yarn start`; `yarn test:visual -- contracts settings dreams stats search-symbols` — 0 diffs, the toggle-button contract passes unchanged (its values are the same, only their source moved). If a diff appears in a toggle group, compare computed styles of the affected button in both reports and add the missing declaration with the same `!important` treatment.
- [ ] **Step 4: Commit** `git commit -am "refactor(theme): toggle-button overrides move from index.css into Theme.ts (#1)"`

### Task 12: `sx` translation rules (reference for Tasks 13–19)

No files. Read before every M3 task. MUI's spacing unit is 8px and Tailwind's is 4px, so **multiply MUI numbers by 2**; rem strings map 1:1 (`1rem` = `4`). Breakpoint keys map 1:1 (`sm`/`md`/`lg` are 600/900/1200 in both systems): `{ xs: A, sm: B }` → `A sm:B`. Merge into an existing `className` with `classnames()` from `src/utils/classnames` when conditional.

| `sx`                                                                                                                                                                                                                                                                 | className                                                                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mb: 2` (85×) / `mb: 3` / `marginBottom: "1.5rem"` / `mb: 1` / `mb: 7`                                                                                                                                                                                               | `mb-4` / `mb-6` / `mb-6` / `mb-2` / `mb-14`                                                                                                                                                                                                                                        |
| `paddingBottom: "0"` (48×)                                                                                                                                                                                                                                           | `pb-0`                                                                                                                                                                                                                                                                             |
| `ml: 2` / `ml: 1` / `ml: ".5rem"` / `ml: "auto"` / `ml: 1.5` / `ml: -14`                                                                                                                                                                                             | `ml-4` / `ml-2` / `ml-2` / `ml-auto` / `ml-3` / `-ml-28`                                                                                                                                                                                                                           |
| `mr: 0` / `mr: 1` / `mr: "auto"` / `marginRight: "0.5rem"`                                                                                                                                                                                                           | `mr-0` / `mr-2` / `mr-auto` / `mr-2`                                                                                                                                                                                                                                               |
| `mt: 2` / `marginTop: "1rem"` / `my: 2` / `mt: 2, mb: 2`                                                                                                                                                                                                             | `mt-4` / `mt-4` / `my-4` / `mt-4 mb-4`                                                                                                                                                                                                                                             |
| `p: 2` / `p: 1` / `px: 2, py: "11px"` / `px: 1` / `px: "14px"` / `pl: "14px"`                                                                                                                                                                                        | `p-4` / `p-2` / `px-4 py-[11px]` / `px-2` / `px-[14px]` / `pl-[14px]`                                                                                                                                                                                                              |
| `mx: 2, mb: 2`                                                                                                                                                                                                                                                       | `mx-4 mb-4`                                                                                                                                                                                                                                                                        |
| `textAlign: "center" / "left" / "right"`                                                                                                                                                                                                                             | `text-center` / `text-left` / `text-right`                                                                                                                                                                                                                                         |
| `color: "red"` / `color: "white"`                                                                                                                                                                                                                                    | `text-[red]` / `text-white`                                                                                                                                                                                                                                                        |
| `display: "block" / "flex" / "inline-block" / "none"`                                                                                                                                                                                                                | `block` / `flex` / `inline-block` / `hidden`                                                                                                                                                                                                                                       |
| `display: "none", displayPrint: "block"`                                                                                                                                                                                                                             | `hidden print:block`                                                                                                                                                                                                                                                               |
| `display: "flex", justifyContent: "space-between", alignItems: "center"`                                                                                                                                                                                             | `flex justify-between items-center`                                                                                                                                                                                                                                                |
| `display: "flex", justifyContent: "center"`                                                                                                                                                                                                                          | `flex justify-center`                                                                                                                                                                                                                                                              |
| `flexWrap: "wrap"` / `flexShrink: 0` / `flex: 1` / `flexGrow: 1` / `gap: 2`                                                                                                                                                                                          | `flex-wrap` / `shrink-0` / `flex-1` / `grow` / `gap-4`                                                                                                                                                                                                                             |
| `height: "100%"` / `minHeight: "21rem"` / `minWidth: 0` / `minWidth: "12rem"`                                                                                                                                                                                        | `h-full` / `min-h-84` / `min-w-0` / `min-w-48`                                                                                                                                                                                                                                     |
| `position: "relative" / "absolute" / "static"`                                                                                                                                                                                                                       | `relative` / `absolute` / `static`                                                                                                                                                                                                                                                 |
| `fontStyle: "italic"` / `fontSize: "1.875rem"` (font-size only!) / `whiteSpace: "nowrap"` / `verticalAlign: "middle"`                                                                                                                                                | `italic` / `text-[1.875rem]` (NOT `text-3xl`, which also sets line-height) / `whitespace-nowrap` / `align-middle`                                                                                                                                                                  |
| `border: 1, borderRadius: 1, borderColor: "#c4c4c4"`                                                                                                                                                                                                                 | `border border-[#c4c4c4] rounded-sm` (`borderRadius: 1` = theme 4px = `rounded-sm` in v4)                                                                                                                                                                                          |
| `borderColor: "white"` / `"lightgray"`                                                                                                                                                                                                                               | `border-white` / `border-[lightgray]`                                                                                                                                                                                                                                              |
| `backgroundColor: cond ? "lightgray !important" : "transparent"`                                                                                                                                                                                                     | `classnames(cond ? "bg-[lightgray]!" : "bg-transparent")`                                                                                                                                                                                                                          |
| `"&:hover": { textDecoration: "none !important" }`                                                                                                                                                                                                                   | `hover:no-underline!`                                                                                                                                                                                                                                                              |
| `width: { xs: "50%", sm: "100%" }`                                                                                                                                                                                                                                   | `w-1/2 sm:w-full`                                                                                                                                                                                                                                                                  |
| `margin: "auto"` / `margin: { xs: "0 auto -2rem", sm: "auto" }`                                                                                                                                                                                                      | `m-auto` / `mx-auto mt-0 -mb-8 sm:m-auto`                                                                                                                                                                                                                                          |
| `margin: { xs: "2rem auto", sm: "3rem auto" }`                                                                                                                                                                                                                       | `my-8 mx-auto sm:my-12`                                                                                                                                                                                                                                                            |
| `mb: { xs: "1rem", sm: "0" }` / `marginBottom: { xs: "2rem", sm: "0" }`                                                                                                                                                                                              | `mb-4 sm:mb-0` / `mb-8 sm:mb-0`                                                                                                                                                                                                                                                    |
| `display: { xs: "block", sm: "flex" }` / `{ xs: "none", sm: "inline" }` / `{ xs: "inline", sm: "none" }` / `{ xs: "flex", md: "none" }` / `{ xs: "none", md: "flex" }` / `{ xs: "none", lg: "flex" }` / `{ xs: "block", md: "none" }` / `{ xs: "grid", md: "flex" }` | `block sm:flex` / `hidden sm:inline` / `inline sm:hidden` / `flex md:hidden` / `hidden md:flex` / `hidden lg:flex` / `block md:hidden` / `grid md:flex`                                                                                                                            |
| `mr: { xs: 0, md: 2 }` / `ml: { xs: 0, md: 2 }` / `mb: { xs: 2, md: 0 }` / `mb: { xs: 1, sm: 2, md: 0 }` / `ml: { xs: 0, sm: 2 }`                                                                                                                                    | `mr-0 md:mr-4` / `ml-0 md:ml-4` / `mb-4 md:mb-0` / `mb-2 sm:mb-4 md:mb-0` / `ml-0 sm:ml-4`                                                                                                                                                                                         |
| `mt: { xs: -4, sm: -11 }, mb: 2`                                                                                                                                                                                                                                     | `-mt-8 sm:-mt-22 mb-4`                                                                                                                                                                                                                                                             |
| `overflowX: "hidden", marginBottom: { xs: "2rem", sm: "0" }, borderRadius: "4px"`                                                                                                                                                                                    | `overflow-x-hidden mb-8 sm:mb-0 rounded-sm`                                                                                                                                                                                                                                        |
| `minHeight: { xs: "80px" }, flexWrap: { xs: "wrap", md: "nowrap" }`                                                                                                                                                                                                  | `min-h-20 flex-wrap md:flex-nowrap`                                                                                                                                                                                                                                                |
| `marginLeft: { xs: "0", md: "120px" }` (`SQUARE_LOGO_SIZE - 30`)                                                                                                                                                                                                     | `ml-0 md:ml-30`                                                                                                                                                                                                                                                                    |
| `paddingTop: { xs: "8.5rem", md: 0 }, flexDirection: { xs: "column", md: "row" }, alignItems: { xs: "start", md: "center" }, width: { xs: "100%", md: "auto" }`                                                                                                      | `pt-34 md:pt-0 flex-col md:flex-row items-start md:items-center w-full md:w-auto` (`items-start` is `flex-start`; in a flex/grid container identical to `start`)                                                                                                                   |
| `top: "3.75rem", right: "1.25rem"` / `right: "1rem", top: "22px"`                                                                                                                                                                                                    | `top-15 right-5` / `right-4 top-[22px]`                                                                                                                                                                                                                                            |
| `order: { xs: -1, md: "unset" }`                                                                                                                                                                                                                                     | `-order-1 md:order-none`                                                                                                                                                                                                                                                           |
| `minWidth: { xs: "48px !important", sm: "86px" }, px: { xs: "7px", sm: "11px" }`                                                                                                                                                                                     | `min-w-[48px]! sm:min-w-[86px] px-[7px] sm:px-[11px]` — keeps the quirk in "M0 as built" finding 1: the important base class wins at every width, exactly as the `xs` value does today                                                                                             |
| `"& > span": { mr: 2, flexShrink: 0 }` (autocomplete option)                                                                                                                                                                                                         | `[&>span]:mr-4 [&>span]:shrink-0`                                                                                                                                                                                                                                                  |
| `"& .MuiChip-deleteIcon": { color: "rgba(255,255,255,0.7)", "&:hover": { color: "white" } }`                                                                                                                                                                         | `[&_.MuiChip-deleteIcon]:text-white/70 [&_.MuiChip-deleteIcon:hover]:text-white`                                                                                                                                                                                                   |
| `transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s"`                                                                                                                                                                                          | `classnames("[transition:transform_0.2s]", open && "[transform:rotate(180deg)]")` (NOT `rotate-180`/`transition-transform`: v4 animates the `rotate` property, which `transition: transform` would not cover)                                                                      |
| `inputProps={{ sx: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } }}` (upper glued field)                                                                                                                                                                 | `inputProps={{ className: "rounded-b-none" }}`                                                                                                                                                                                                                                     |
| `inputProps={{ sx: { borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: "-1px" } }}` (lower glued field)                                                                                                                                                    | `inputProps={{ className: "rounded-t-none -mt-px" }}` (`LabeledTextField` merges `inputProps` into MUI's `InputProps`, so the class lands on the `OutlinedInput` root, where the `sx` was)                                                                                         |
| `transformOrigin/transform/willChange/mb` computed from a measured width (`SymbolsRadioList.tsx:108`)                                                                                                                                                                | `style={{ transformOrigin: "top center", transform: …, willChange: "transfrom", marginBottom: … }}` — genuinely dynamic numbers; the only sanctioned `style` prop. Keep the existing `"transfrom"` typo (a no-op today; fixing it changes compositing and is a separate decision). |

Rules: (1) `Grid` breakpoint props (`xs={12} md={4}`), `spacing`, `Container maxWidth`, `Dialog maxWidth` are MUI layout props, not `sx` — untouched. (2) Dead classes found on the way (`flex-column` on CardActions — not a Tailwind class; `flex-row` on non-flex boxes) may be deleted, snapshot-verified. (3) An `sx` that a table row does not cover: derive with the same arithmetic, compile-check the class with `yarn build` (an unknown class silently generates nothing) and add the row here. (4) After each group: `yarn build && yarn start`, `yarn test:visual` (0 diffs), `grep -c "sx={" <files>` = 0, `npm run lint`, `npm run type:check`, commit.

### Task 13: M3.1 static content pages (blog, faq, privacy, terms)

**Files:** `src/pages/blog/index.tsx` (1), the 12 `src/pages/blog/*/index.tsx` articles (74 in total: support-us-on-patreon 9, life-purpose-milestone-1 9, dreamingsheep-is-now-open-source 9, use-case-three-off-the-charts 8, privacy-policy-and-terms-of-service-update 7, the-brainstorming 6, dreamingsheep-v1-0-1-released 6, backstory-the-beginnings 6, use-case-one-custom-drawing 4, the-explainer-video-is-still-in-the-works 4, use-case-two-add-to-home-screen 3, a-glitch-in-the-dream-journal-matrix 3), `src/pages/faq/index.tsx` (17), `src/pages/privacy-policy/index.tsx` (19), `src/pages/terms-of-service/index.tsx` (19).

- [ ] **Step 1:** Convert every `sx` with the table (this group is almost entirely `mb: 2` → `mb-4`, `paddingBottom: "0"` → `pb-0`, `mt: 2, textAlign: "right"` → `mt-4 text-right`, `ml: { xs: 0, sm: 2 }` → `ml-0 sm:ml-4`, `fontStyle: "italic", mb: 2` → `italic mb-4`).
- [ ] **Step 2:** `grep -c "sx={" src/pages/blog src/pages/faq src/pages/privacy-policy src/pages/terms-of-service` → 0 everywhere. Add the two remaining blog articles to `public.visual.test.ts` `PAGES` if their `sx` shapes differ from the two already covered (they do not — skip unless Step 3 shows a surprise).
- [ ] **Step 3:** `yarn build && yarn start && yarn test:visual -- public` → 0 diffs; lint; type-check.
- [ ] **Step 4:** `git commit -am "refactor(content): sx → tailwind classes on blog/faq/privacy/terms (#1)"`

### Task 14: M3.2 layout chrome (Header, Footer, error and auth containers)

**Files:** `src/core/layouts/Header.tsx` (18), `src/core/layouts/Footer.tsx` (5), `src/pages/_app.tsx` (2), `src/pages/404.tsx` (1), `src/core/components/CustomErrorContainer.tsx` (1), `src/core/components/AuthenticationContainer.tsx` (2), `src/core/components/SheepGridContainer.tsx` (1).

- [ ] **Step 1: Header** — line-by-line (line numbers of the current file):
  - 106 `Toolbar`: `className="py-3 translate-x-0 translate-y-0 transform-gpu min-h-20 flex-wrap md:flex-nowrap"`, keep the comment.
  - 129 `Box`: `className="grow mr-8 ml-0 md:ml-30"` (120px = `SQUARE_LOGO_SIZE - 30`; add `// md:ml-30 = SQUARE_LOGO_SIZE - 30 = 120px` above).
  - 137 title `Box`: `className={classnames(expanded ? "block sm:flex absolute md:static top-15 right-5" : "hidden lg:flex static")}`.
  - 163 Menu `Button`: `className="absolute right-4 top-[22px] border-[lightgray] block md:hidden"`.
  - 182 `Collapse`: `className="w-full md:w-auto"`.
  - 184 nav `Box`: `className="pt-34 md:pt-0 grid md:flex flex-col md:flex-row items-start md:items-center w-full md:w-auto"`, keep the padding comment.
  - 196/214/232/250/268 nav `Button`s: `className={classnames("w-full md:w-auto text-[#202020] shrink-0 mr-0 md:mr-4 hover:no-underline!", active ? "bg-[lightgray]!" : "bg-transparent")}` where `active` is the existing pathname comparison.
  - 284 `TextField`: `className="translate-x-0 translate-y-0 transform-gpu mr-0 md:mr-4 mb-4 md:mb-0 -order-1 md:order-none"`.
  - 309 Settings `Button`: `… mr-0 md:mr-4 flex md:hidden hover:no-underline!` + the active bg pair.
  - 327 Sign-out `Button`: `className="mr-0 md:mr-4 mb-2 sm:mb-4 md:mb-0 flex md:hidden"`.
  - 337/373/382 `Box sx={{ ml: ".5rem" }}`: `className="ml-2"`.
  - 347 account `Button`: `className={classnames("hidden md:flex", active ? "bg-[lightgray]!" : "bg-transparent")}`.
- [ ] **Step 2: Footer** — 45/60/85 `Typography`: `className="my-8 mx-auto sm:my-12"`; 73 `Container`: `className="text-center relative"`; drop the commented `sx` at 74.
- [ ] **Step 3: Containers** — `SheepGridContainer` Box: `className="w-1/2 sm:w-full m-auto"`; `CustomErrorContainer`, `404.tsx`, `_app.tsx:168`: `className="w-1/2 sm:w-full mx-auto mt-0 -mb-8 sm:m-auto"`; `_app.tsx` `Grid container sx={{ mb: 2 }}`: `className="mb-4"`; `AuthenticationContainer.tsx:34`: `className={classnames("w-1/2 sm:w-full", session.userId ? "m-auto" : "mx-auto mt-0 -mb-8 sm:m-auto")}`, line 57: `className="mb-8 sm:mb-0"`.
- [ ] **Step 4:** grep = 0 for the seven files; `yarn build && yarn start && yarn test:visual` (full run — the header is on every page) → 0 diffs; `yarn test:visual -- contracts` green; lint; type-check.
- [ ] **Step 5:** `git commit -am "refactor(layout): sx → tailwind classes in Header, Footer and the sheep/error containers (#1)"`

### Task 15: M3.3 auth pages and forms (glued fields)

**Files:** `src/pages/signup.tsx` (1), `src/pages/forgot-password.tsx` (2), `src/pages/reset-password.tsx` (2), `src/pages/verify-user.tsx` (1), `src/auth/components/LoginForm.tsx` (1 + 2 glued `inputProps.sx`), `src/auth/components/SignupForm.tsx` (1 + 2 glued), `src/auth/components/VerifyUserForm.tsx` (2), `src/core/components/Form.tsx` (1), `src/core/components/LabeledTextFieldFavorite.tsx` (2), plus the glued pairs in `src/pages/reset-password.tsx:91-104`.

- [ ] **Step 1:** Hero boxes → `w-1/2 sm:w-full mx-auto mt-0 -mb-8 sm:m-auto`; `Card sx={{ textAlign: "left" }}` → `className="text-left"`; the rest via the table.
- [ ] **Step 2:** Every glued pair: upper field `inputProps={{ className: "rounded-b-none" }}`, lower field `inputProps={{ className: "rounded-t-none -mt-px" }}`; delete the `// className="rounded-top"` / `"rounded-bottom"` comments (they were an earlier attempt).
- [ ] **Step 3:** `grep -rn "sx:" src` → only `SymbolForm.tsx` and `UpdateUserForm.tsx` remain (Tasks 17/18). `yarn build && yarn start && yarn test:visual -- public contracts` → 0 diffs, the glued-fields contract green (1px overlap, 0px joint radius, 2px cyan focus outline on top).
- [ ] **Step 4:** `git commit -am "refactor(auth): sx → tailwind classes, glued fields via InputProps className (#1)"`

### Task 16: M3.4 dreams

**Files:** `src/pages/dreams/index.tsx` (5), `src/dreams/components/DreamList.tsx` (9), `src/dreams/components/DreamForm.tsx` (1), `src/dreams/components/SymbolsAutocomplete.tsx` (1), `src/dreams/components/CreateInstantSymbolDialog.tsx` (4), `src/core/components/DeletionConfirmationDIalog.tsx` (3), `src/sleepingTimes/components/SleepingTimeForm.tsx` (1).

- [ ] **Step 1: DreamList** — 161: delete the dead `{!isEdit && false && (…)}` block; 196 `CardActions`: `className="p-4 block sm:flex"` (drop the dead `flex-column`); 199 `Box`: `className="flex-row flex-wrap grow overflow-hidden mb-4 sm:mb-0"`; 222 `IconButton`: `className="mr-auto ml-0 md:ml-4"`; 237 Update `Button`: fold `ml-4` into its `className` template; 249 `IconButton`: `className="ml-4"`; 303 `Box`: `className="h-full"`; 310 `Box`: `className="p-4"`; 320 `Grid container`: `className="mt-4 mb-4"`.
- [ ] **Step 2: dreams page** — 205 hero box: `classnames("w-1/2 sm:w-full", user ? "m-auto" : "mx-auto mt-0 -mb-8 sm:m-auto")`; 230 `Grid item`: `className="overflow-x-hidden mb-8 sm:mb-0 rounded-sm"`; 235 `Box`: `className="h-full flex min-h-84"`; 258 `Grid container`: `className="-mt-8 sm:-mt-22 mb-4"`; 357 Add `Button`: fold `ml-4` into the template.
- [ ] **Step 3:** `SymbolsAutocomplete.tsx:60` option `Box`: `className="[&>span]:mr-4 [&>span]:shrink-0"`; dialogs: `Box` → `text-center`, `DialogActions` → `mx-4 mb-4`, `DialogContentText sx={{ mb: 2 }}` → `mb-4`, buttons `ml-4`; `DreamForm`, `SleepingTimeForm` (`minWidth: 0, px: 1` → `min-w-0 px-2`) via the table.
- [ ] **Step 4:** grep = 0; `yarn build && yarn start && yarn test:visual -- dreams stats contracts` → 0 diffs (the delete/instant dialogs included); `npm run test:e2e` (dreams CRUD); lint; type-check.
- [ ] **Step 5:** `git commit -am "refactor(dreams): sx → tailwind classes (#1)"`

### Task 17: M3.5 search and symbols

**Files:** `src/pages/search/index.tsx` (3), `src/dreams/components/DreamSearchForm.tsx` (5), `src/pages/symbols/index.tsx` (3), `src/symbols/components/SymbolCard.tsx` (7), `src/symbols/components/SymbolsList.tsx` (2), `src/symbols/components/SymbolForm.tsx` (1 + 2 glued), `src/symbols/components/SymbolJumpAutocomplete.tsx` (4), `src/core/components/FileUpload/index.tsx` (1), `src/core/components/FileUpload/components/Preview.tsx` (3).

- [ ] **Step 1:** `SymbolCard.tsx:149` `CardActions`: `className={classnames("p-4", isEdit ? "block sm:flex pt-0" : "flex")}` (merge with the existing template at 148); 173 `IconButton`: `mr-auto ml-0 md:ml-4`; `DreamSearchForm.tsx:77-78`: `<Settings className="inline sm:hidden" />`, `<Box className="hidden sm:inline">Filters</Box>`; `SymbolJumpAutocomplete.tsx:53`: `grow min-w-48`; `SymbolForm` glued pair as in Task 15; everything else via the table.
- [ ] **Step 2:** grep = 0; `yarn test:visual -- search-symbols contracts` → 0 diffs; `npm run test:e2e` (symbols CRUD, search); lint; type-check.
- [ ] **Step 3:** `git commit -am "refactor(search,symbols): sx → tailwind classes (#1)"`

### Task 18: M3.6 settings

**Files:** `src/pages/settings/index.tsx` (1), `src/users/components/UpdateUserForm.tsx` (20 + 2 glued), `src/core/components/SymbolsRadioList.tsx` (3), `src/settings/components/ExportDreams/index.tsx` (2), `src/core/components/CheckboxField.tsx` (0, check).

- [ ] **Step 1: UpdateUserForm** — `CardHeader sx={{ paddingBottom: "0" }}` ×6 → `pb-0` (line 274–279 already has a `className` template: merge `pb-0` into it); `Button sx={{ ml: "auto" }}` ×5 → `ml-auto`; `IconButton sx={{ ml: 2 }}` → `ml-4`; `IconButton sx={{ ml: "auto" }}` ×3 → `ml-auto`; `CardActions sx={{ p: 2 }}` ×3 → `p-4`; 288 `CardActions`: merge `block sm:flex` into the existing template; 293 `Typography`: merge `mb-4 sm:mb-0`; the change-password glued pair (202/214) as in Task 15.
- [ ] **Step 2: SymbolsRadioList** — 81 `Box`: `h-full`; 108 `Box`: replace the `sx` by the `style` prop from the table (dynamic), keeping `className` as is; 143 `Typography`: `text-[red]`.
- [ ] **Step 3:** settings page hero box (conditional, as in Task 16); `ExportDreams` `DialogActions` → `mx-4 mb-4`, button → `ml-4`.
- [ ] **Step 4:** grep = 0 (`grep -rn "sx:" src` → 0 now); `yarn test:visual -- settings stats contracts` → 0 diffs (all five edit states, the scaled toggle grid, the export/delete dialogs); `npm run test:e2e` (settings-stats); lint; type-check.
- [ ] **Step 5:** `git commit -am "refactor(settings): sx → tailwind classes (#1)"`

### Task 19: M3.7 stats

**Files:** `src/pages/stats/index.tsx` (15), `src/stats/components/AdvancedStats.tsx` (4), `src/stats/components/StatSymbolChart.tsx` (2), `src/stats/components/SleepChart.tsx` (1).

- [ ] **Step 1:** 183 hero box (conditional); 212 `Box`: `flex justify-between items-start flex-wrap gap-4`; 244 `ToggleButton`: `min-w-[48px]! sm:min-w-[86px] px-[7px] sm:px-[11px]`; 249/279 `Box component="span"`: `hidden sm:inline`; 252/278 `inline sm:hidden` (the `<Settings />` icon takes `className`); 271 `ExpandMore`: `classnames("[transition:transform_0.2s]", advancedOpen && "[transform:rotate(180deg)]")`; `AdvancedStats.tsx:113` `Chip`: `ml-3 align-middle text-white border-white [&_.MuiChip-deleteIcon]:text-white/70 [&_.MuiChip-deleteIcon:hover]:text-white`; `StatSymbolChart` `Container`/`div`: `flex justify-center`; the rest via the table.
- [ ] **Step 2:** grep = 0 → **`grep -rn "sx={" src --include=*.tsx | wc -l` = 0 for the whole repo**; `yarn build && yarn start && yarn test:visual` (full run) → 0 diffs; `npm run test:e2e`; lint; type-check.
- [ ] **Step 3:** `git commit -am "refactor(stats): sx → tailwind classes — zero sx left (#1)"`

### Task 20: Lint guard, dead CSS, docs (M4)

**Files:**

- Modify: `.eslintrc.js`
- Modify: `src/styles/index.css` (dead rules), `public/styles/noscript.css` (no change — mirror stays)
- Modify: `CLAUDE.md`, `src/CLAUDE.md`, `ROADMAP.md`, `README.md` (if it mentions the Tailwind config)

- [ ] **Step 1: ESLint** — forbid `sx` for good (the rule ships with `eslint-config-next`'s `eslint-plugin-react`):

```js
module.exports = {
  extends: ["eslint-config-next", "prettier"],
  rules: {
    // issue #1: appearance lives in src/styles/Theme.ts, layout in Tailwind classes — never in sx
    "react/forbid-component-props": [
      "error",
      {
        forbid: [
          {
            propName: "sx",
            message:
              "Use Tailwind classes (className) or a theme override in src/styles/Theme.ts — issue #1",
          },
        ],
      },
    ],
  },
}
```

`npm run lint` → clean (there is no `sx` left). Verify the rule bites: add `sx={{}}` to any component, lint fails, revert.

- [ ] **Step 2: Dead CSS** — delete `.MuiModal-root .temporary-img-fix` from `index.css` and the `temporary-img-fix` class from `DeletionConfirmationDIalog.tsx:70` (the utilities carry it now); re-run `yarn test:visual -- dreams settings` → 0 diffs. Leave every other rule.
- [ ] **Step 3: Docs**
  - `CLAUDE.md` frozen-deps bullet: `MUI 5 + Tailwind 3` → `MUI 5 + Tailwind 4.1.18 (@tailwindcss/postcss, no autoprefixer/postcss) coexisting under @layer theme, base, mui, components, utilities — src/styles/index.css and src/createEmotionCache.ts; utilities win, sx is forbidden by ESLint`. Add `@playwright/test 1.63.0 (visual suite)` to the test tooling line and a "Visual" line under Commands: `npm run test:visual # playwright snapshots, needs prod build + seeded DB (test/visual/README.md)`.
  - `src/CLAUDE.md` Pages bullet "MUI sx, MUI className and Tailwind utilities are mixed…" → replace with: `Styling: Tailwind classes for layout/spacing/responsive (breakpoints sm 600 / md 900 / lg 1200 = MUI's; xsmax: is ≤ 320 inclusive; hover: applies on touch too), src/styles/Theme.ts for MUI component looks, style={} only for measured/computed numbers; sx is forbidden (ESLint). The important modifier is a suffix (min-w-[48px]!). MUI portals (Dialog/Menu/Popper) receive utilities like everything else.` Add to Gotchas: `Tailwind v4 dev output uses native CSS nesting; production flattens it. The visual suite therefore runs against yarn build && yarn start.`
  - `ROADMAP.md`: move `#1` to "Recently shipped" once released (leave a note "landed on main, release pending" until then).
- [ ] **Step 4:** `npm run lint && npm run type:check && npm test`; `git commit -am "chore(lint): forbid sx; document the tailwind v4 conventions (#1)"`

### Task 21: Final verification, PR, release hand-off

- [ ] **Step 1: Clean tree, fresh install** `git status` clean; `rm -rf node_modules && yarn install --frozen-lockfile && npx prisma generate && yarn build` — green.
- [ ] **Step 2: The full gate one last time**: prod server up → `yarn test:visual` (0 diffs, contracts + layers green) → `npm run dev` → `npm run test:e2e` → `npm run lint` → `npm run type:check` (≤ baseline) → `npm test`.
- [ ] **Step 3: Manual pass in a real browser** at 320, 375, 600, 900, 1200 widths (Chrome devtools device toolbar): card toggle animations on `/dreams` and `/settings`, the toggle grid scale on the symbols card, the header at 899/900/1000/1100 (nav must not wrap under the logo), the login form focus states, the symbols autocomplete, the dialogs. Also open the site once in Safari (or the Playwright WebKit build: `npx playwright install webkit`, then a one-off `--browser webkit` run of `public`) — the `-webkit-box-decoration-break` footer stripes and the icon font must render.
- [ ] **Step 4: PR** — `git push -u origin tailwind-v4`, `gh pr create --title "Tailwind CSS v4 + cascade layers, sx removed (#1)" --body-file <file>` with: the milestone list, the dependency diff (from `git diff main -- package.json`), the vendor-prefix diff (Task 10), the portal audit table (Task 9), every approved snapshot re-baseline with its reason (ideally none), the browser-floor note (Safari 15.4+/Chrome 99+/Firefox 97+; full fidelity 16.4/111/128), and "Closes #1". End the body with the attribution line required by the session.
- [ ] **Step 5: Hand-off to the maintainer** (not done by the executor): merge; then when satisfied — `git checkout main && git pull`, bump `"version"` (a visual-infrastructure + styling-engine change reads like `5.0.0`; the maintainer decides), `git commit -am 'new version vX.Y.Z'`, `git push origin main`, `git tag -a vX.Y.Z -m "Release vX.Y.Z"`, `git push origin vX.Y.Z` → deploy. The deploy box runs `yarn install` + `yarn build` on Node 22 ARM64; `@tailwindcss/oxide-linux-arm64-gnu` 4.1.18 exists, so no native-build surprises. After the deploy, hit https://dreamingsheep.net on a phone (320-wide if available) and a desktop.
