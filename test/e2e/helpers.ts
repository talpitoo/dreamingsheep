import puppeteer, { Browser, Page } from "puppeteer"

/**
 * Shared plumbing for the puppeteer E2E suite.
 *
 * Prerequisites (local machine):
 *   1. `nvm use 22 && npm run dev` — app running (default http://localhost:3000,
 *      override with E2E_BASE_URL)
 *   2. a seeded dev database (`npm run db:seed`) — the flows log in as the demo
 *      user zhuangzi and rely on the seeded dreams (e.g. "The Butterfly Dream")
 *
 * The flows clean up after themselves (created dreams/symbols are deleted,
 * toggled settings are restored).
 */

export const BASE = process.env.E2E_BASE_URL || "http://localhost:3000"
export const ZHUANGZI = { email: "zhuangzi@dreamingsheep.net", password: "zhuangzi" }

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function ensureServerUp() {
  try {
    await fetch(BASE)
  } catch (error) {
    throw new Error(
      `dreamingsheep is not running at ${BASE} — start it first:\n` +
        `  nvm use 22 && npm run dev   (with a seeded DB: npm run db:seed)\n` +
        `or point E2E_BASE_URL at a running instance.`
    )
  }
}

export async function launchBrowser(): Promise<Browser> {
  await ensureServerUp()
  return puppeteer.launch({ args: ["--no-sandbox"] })
}

export async function newPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })
  return page
}

export async function login(page: Page, user = ZHUANGZI) {
  await page.goto(BASE, { waitUntil: "networkidle2" })
  await page.waitForSelector('input[name="email"]', { timeout: 30_000 })
  await page.type('input[name="email"]', user.email)
  await page.type('input[name="password"]', user.password)
  await page.keyboard.press("Enter")
  await page
    .waitForNavigation({ waitUntil: "networkidle2", timeout: 60_000 })
    .catch(() => undefined)
  await sleep(1500)
}

export function bodyText(page: Page): Promise<string> {
  return page.evaluate(() => document.body.innerText)
}

/** Wait until the page's body text contains (or stops containing) a string. */
export async function waitForText(page: Page, text: string, options?: { absent?: boolean }) {
  const absent = options?.absent ?? false
  for (let attempt = 0; attempt < 30; attempt++) {
    const contains = (await bodyText(page)).includes(text)
    if (contains !== absent) return
    await sleep(1000)
  }
  throw new Error(`Timed out waiting for "${text}" to be ${absent ? "absent" : "present"}`)
}

/** Click the first <button> or <a> whose trimmed text equals the given label. */
export async function clickButtonWithText(page: Page, label: string) {
  const clicked = await page.evaluate((label) => {
    const element = [...document.querySelectorAll("button, a")].find(
      (candidate) => candidate.textContent?.trim() === label
    ) as HTMLElement | undefined
    element?.click()
    return !!element
  }, label)
  if (!clicked) throw new Error(`No button with text "${label}" found`)
}

/** Submit a form by id via its external submit button (falling back to requestSubmit). */
export async function submitForm(page: Page, formId: string) {
  await page.evaluate((formId) => {
    const button = document.querySelector(
      `button[type="submit"][form="${formId}"]`
    ) as HTMLElement | null
    if (button) button.click()
    else (document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit()
  }, formId)
}

/** Jump to the last page of an MUI pagination, if one is present. */
export async function gotoLastPaginationPage(page: Page) {
  const moved = await page.evaluate(() => {
    const items = [...document.querySelectorAll(".MuiPagination-ul .MuiPaginationItem-page")]
    const last = items[items.length - 1] as HTMLElement | undefined
    if (last && last.getAttribute("aria-current") !== "true") {
      last.click()
      return true
    }
    return false
  })
  if (moved) await sleep(2000)
}

/** Click the trash icon inside the card that contains the given text. */
export async function clickTrashInCard(page: Page, cardText: string) {
  const clicked = await page.evaluate((cardText) => {
    const card = [...document.querySelectorAll(".MuiCard-root")].find((candidate) =>
      candidate.textContent?.includes(cardText)
    )
    const trash = card?.querySelector("span.lucidicon-trash")?.closest("button")
    ;(trash as HTMLElement | undefined)?.click()
    return !!trash
  }, cardText)
  if (!clicked) throw new Error(`No trash button found in a card containing "${cardText}"`)
}

/** Confirm the currently open deletion dialog (clicks its non-Cancel button). */
export async function confirmDeletionDialog(page: Page) {
  await page.waitForSelector(".MuiDialog-root button", { timeout: 10_000 })
  await page.evaluate(() => {
    const buttons = [...document.querySelectorAll(".MuiDialog-root button")]
    const confirm = buttons.find((button) => button.textContent?.trim() !== "Cancel")
    ;(confirm as HTMLElement | undefined)?.click()
  })
}

/**
 * Read or change one of the Settings page checkbox cards (form ids:
 * "bedtime", "advanced-charting"). Returns the state found *before* any change,
 * so callers can restore it afterwards.
 */
export async function setCheckboxSetting(page: Page, formId: string, desired?: boolean) {
  await page.goto(`${BASE}/settings`, { waitUntil: "networkidle2" })
  await page.waitForSelector(`#${formId} input[type="checkbox"]`, { timeout: 30_000 })
  await sleep(1000)
  const before = await page.evaluate(
    (formId) =>
      (document.querySelector(`#${formId} input[type="checkbox"]`) as HTMLInputElement).checked,
    formId
  )
  if (desired === undefined || desired === before) return before

  // pencil -> toggle -> Update (the page reloads on success)
  await page.evaluate((formId) => {
    const form = document.getElementById(formId)!
    ;(form.querySelector("button.MuiIconButton-root") as HTMLElement).click()
  }, formId)
  await sleep(500)
  await page.evaluate((formId) => {
    ;(document.querySelector(`#${formId} input[type="checkbox"]`) as HTMLElement).click()
  }, formId)
  await sleep(300)
  await submitForm(page, formId)
  await page
    .waitForNavigation({ waitUntil: "networkidle2", timeout: 60_000 })
    .catch(() => undefined)
  await sleep(2000)
  return before
}
