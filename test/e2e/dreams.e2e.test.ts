import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { Browser, Page } from "puppeteer"
import {
  BASE,
  bodyText,
  clickButtonWithText,
  clickTrashInCard,
  confirmDeletionDialog,
  launchBrowser,
  login,
  newPage,
  sleep,
  submitForm,
  waitForText,
} from "./helpers"

// full dream lifecycle: create -> visible -> delete -> gone
describe("dreams CRUD", () => {
  let browser: Browser
  let page: Page
  const title = `e2e dream ${Date.now()}`

  beforeAll(async () => {
    browser = await launchBrowser()
    page = await newPage(browser)
    await login(page)
  })
  afterAll(async () => {
    // safety net: if an assertion failed mid-flow, still try to remove the dream
    try {
      await page.goto(`${BASE}/search?q=${encodeURIComponent(title)}`, {
        waitUntil: "networkidle2",
      })
      await sleep(2000)
      if ((await bodyText(page)).includes(title)) {
        await clickTrashInCard(page, title)
        await confirmDeletionDialog(page)
        await sleep(2000)
      }
    } catch (error) {
      // best effort only
    }
    await browser?.close()
  })

  it("logging in lands on the dreams journal", async () => {
    expect(page.url()).toContain("/dreams")
  })

  it("creates a dream and shows it in the list", async () => {
    await page.goto(`${BASE}/dreams`, { waitUntil: "networkidle2" })
    await sleep(2000)
    await clickButtonWithText(page, "New dream")
    await page.waitForSelector('#create-dream input[name="title"]', { timeout: 15_000 })
    await page.type('#create-dream input[name="title"]', title)
    await page.type('#create-dream textarea[name="description"]', "wrote itself, end to end 🦋")
    await submitForm(page, "create-dream")
    await waitForText(page, title)
  })

  it("finds the new dream via search (cross-page effect)", async () => {
    await page.goto(`${BASE}/search?q=${encodeURIComponent(title)}`, {
      waitUntil: "networkidle2",
    })
    await sleep(2000)
    const text = await bodyText(page)
    expect(text).toContain("1 results")
    expect(text).toContain(title)
  })

  it("deletes the dream after confirmation and it disappears", async () => {
    await clickTrashInCard(page, title)
    await confirmDeletionDialog(page)
    await waitForText(page, title, { absent: true })

    await page.goto(`${BASE}/search?q=${encodeURIComponent(title)}`, {
      waitUntil: "networkidle2",
    })
    await sleep(2000)
    expect(await bodyText(page)).toContain("0 results")
  })
})
