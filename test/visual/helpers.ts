import { expect, Locator, Page } from "@playwright/test"
import fs from "fs"
import path from "path"

export const ZHUANGZI = { email: "zhuangzi@dreamingsheep.net", password: "zhuangzi" }
export const BASE_URL = process.env.VISUAL_BASE_URL || "http://localhost:3000"
export const AUTH_FILE = path.join(__dirname, ".auth", "zhuangzi.json")
export const SNAPSHOTS_DIR = path.join(__dirname, "__snapshots__")
export const META_FILE = path.join(SNAPSHOTS_DIR, "meta.json")

export interface Meta {
  /** the day `npm run db:seed` ran — the seeded dreams are dated relative to it */
  seedDate: string
  /** see shot() */
  capture: "fullpage" | "tall"
}

// written by global-setup.ts before the workers start; read from the file rather than from
// process.env so it survives however the runner spawns its workers
let cached: Meta | null = null
function meta(): Meta {
  if (!cached) {
    if (!fs.existsSync(META_FILE)) {
      throw new Error(`${META_FILE} is missing — global-setup.ts did not run`)
    }
    cached = JSON.parse(fs.readFileSync(META_FILE, "utf8")) as Meta
  }
  return cached
}

/** YYYY-MM-DD of the day the database was seeded */
export const seedDate = () => meta().seedDate

/** seedDate ± n days as YYYY-MM-DD (pure UTC arithmetic, no time-zone surprises) */
export function daysFromSeed(offset: number): string {
  const [year, month, day] = seedDate().split("-").map(Number) as [number, number, number]
  return new Date(Date.UTC(year, month - 1, day + offset)).toISOString().slice(0, 10)
}

/**
 * Open the dreams journal on a given day.
 *
 * NOT via /dreams?date=… : src/pages/dreams/index.tsx pushes its own ?date=<today> from an effect
 * that does not wait for the router to hydrate the query string, so a deep link races with that
 * push and the page can end up on either day (pre-existing behaviour, visible with and without a
 * frozen clock). Freezing the clock ON the wanted day and loading a bare /dreams makes both paths
 * agree, so the page always settles on the same date.
 */
export async function gotoDreamsDay(page: Page, day: string) {
  await page.goto("/dreams")
  await page.waitForFunction(
    (expected) => new URL(location.href).searchParams.get("date") === expected,
    day,
    { timeout: 30_000 }
  )
}

export const width = (page: Page) => page.viewportSize()!.width

// third parties that inject non-deterministic pixels or beacons; Google Charts
// (gstatic.com/charts) stays allowed — the stats page needs it
const BLOCKED = ["**/googletagmanager.com/**", "**/google-analytics.com/**", "**/recaptcha/**"]

export interface PrepareOptions {
  /** leave the cookie notice un-acknowledged (default: acknowledged, so it never shows) */
  cookieNotice?: boolean
  /**
   * The day the frozen clock reports, YYYY-MM-DD (default: the seed day). The dreams page derives
   * its list and calendar from "today" whenever the URL carries no ?date=, so a test that wants a
   * particular day freezes the clock on it and navigates to a bare /dreams — see dreamsDay().
   */
  now?: string
}

/** Call before the first page.goto(): blocks third parties, freezes the clock, hides the cookie notice. */
export async function prepare(page: Page, options: PrepareOptions = {}) {
  for (const pattern of BLOCKED) {
    await page.route(pattern, (route) => route.abort())
  }
  // Date / luxon DateTime.now() / moment() freeze at 10:00 on the chosen day, so the seeded dreams
  // are in range again and every date-driven query window is stable. Timers keep running, so MUI
  // transitions and Collapse still complete.
  await page.clock.setFixedTime(new Date(`${options.now ?? seedDate()}T10:00:00`))
  // The footer picks its tagline with Math.random() once a user is logged in
  // (src/core/layouts/Footer.tsx) — twelve quotes of different lengths, some with a second
  // attribution line, so the page height moves under everything above it. Pinning random to 0
  // selects "Long time no sleep?™", the same single-line tagline anonymous visitors always get.
  // Safe to override wholesale: the only other Math.random() in the codebase generates OTP codes
  // and runs on the server.
  await page.addInitScript(() => {
    Math.random = () => 0
  })
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
 * Animated GIFs keep playing through `animations: "disabled"` (that only stops CSS animations and
 * transitions), so two consecutive captures never match — public/assets/blog-dna.gif on the blog.
 * Their box is sized by next/image's width/height attributes, so masking the pixels still leaves
 * any layout change around them visible.
 */
const alwaysMask = (page: Page) => [page.locator('img[src*=".gif"]')]

/**
 * Screenshot compared with __snapshots__/<project>/<file>/<name>.png.
 * capture "fullpage" (default) uses Chromium's captureBeyondViewport; "tall" resizes the viewport
 * to the document height instead (fallback if the sticky AppBar renders wrongly, see README).
 * The mode lives in meta.json so baseline and compare runs always match.
 */
export async function shot(page: Page, name: string, options: ShotOptions = {}) {
  // A click leaves the pointer on the element it hit, and MUI paints a hover overlay under it
  // (rgba(primary, 0.04)) — whether the pointer is still there at capture time depends on how the
  // layout moved since, so it flaked. Park the pointer outside the viewport: nothing is hovered.
  await page.mouse.move(-1, -1)
  await settle(page)
  const mask = [...alwaysMask(page), ...(options.mask ?? [])]
  if (meta().capture === "tall") {
    const viewport = page.viewportSize()!
    const height = await page.evaluate(() => document.documentElement.scrollHeight)
    await page.setViewportSize({ width: viewport.width, height: Math.max(height, viewport.height) })
    await settle(page)
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: false, mask })
    await page.setViewportSize(viewport)
  } else {
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true, mask })
  }
}

/**
 * Open a modal and wait for it. Dialogs are `position: fixed`, so a full-page capture paints them
 * at whatever the scroll offset happens to be — and clicking an opener auto-scrolls it into view.
 * Settling first (a card that just entered edit mode is still animating its margins) and starting
 * from the top of the page makes that offset a pure function of the layout.
 */
export async function openDialog(page: Page, opener: Locator) {
  await settle(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await opener.click()
  await expect(page.locator(".MuiDialog-root")).toBeVisible()
  await settle(page)
}

/** the pencil IconButton of a Settings card (<form id={formId}>) */
export const settingsPencil = (page: Page, formId: string) =>
  page.locator(`form#${formId} button.MuiIconButton-root`)

/**
 * Read or change one of the Settings checkbox cards (form ids "bedtime", "advanced-charting").
 * Port of test/e2e/helpers.ts setCheckboxSetting. Returns the state found *before* any change.
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
