import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { Browser, Page } from "puppeteer"
import {
  BASE,
  bodyText,
  clickButtonWithText,
  clickTrashInCard,
  confirmDeletionDialog,
  gotoLastPaginationPage,
  launchBrowser,
  login,
  newPage,
  sleep,
  submitForm,
  waitForText,
} from "./helpers"

// custom symbol lifecycle: create -> visible -> delete -> gone
describe("symbols CRUD", () => {
  let browser: Browser
  let page: Page
  const name = `e2e-symbol-${Date.now()}`

  beforeAll(async () => {
    browser = await launchBrowser()
    page = await newPage(browser)
    await login(page)
  })
  afterAll(async () => {
    try {
      await page.goto(`${BASE}/symbols`, { waitUntil: "networkidle2" })
      await sleep(2000)
      await gotoLastPaginationPage(page)
      if ((await bodyText(page)).includes(name)) {
        await clickTrashInCard(page, name)
        await confirmDeletionDialog(page)
        await sleep(2000)
      }
    } catch (error) {
      // best effort only
    }
    await browser?.close()
  })

  it("creates a custom symbol and shows it in the list", async () => {
    await page.goto(`${BASE}/symbols`, { waitUntil: "networkidle2" })
    await sleep(2000)
    await clickButtonWithText(page, "New symbol")
    await page.waitForSelector('#create-symbol input[name="name"]', { timeout: 15_000 })
    await page.type('#create-symbol input[name="name"]', name)
    await submitForm(page, "create-symbol")
    await waitForText(page, name)
  })

  it("offers the new symbol in the dream form autocomplete (cross-page effect)", async () => {
    await page.goto(`${BASE}/search`, { waitUntil: "networkidle2" })
    await sleep(2000)
    await clickButtonWithText(page, "Filters")
    await page.waitForSelector('input[placeholder="type to search symbols..."]', {
      timeout: 15_000,
    })
    await page.type('input[placeholder="type to search symbols..."]', name)
    await sleep(1500)
    const options = await page.evaluate(() =>
      [...document.querySelectorAll('li[role="option"]')].map((option) =>
        option.textContent?.trim()
      )
    )
    expect(options).toContain(name)
  })

  it("deletes the symbol after confirmation and it disappears", async () => {
    await page.goto(`${BASE}/symbols`, { waitUntil: "networkidle2" })
    await sleep(2000)
    // user-created symbols live on the LAST pagination page
    await gotoLastPaginationPage(page)
    await clickTrashInCard(page, name)
    await confirmDeletionDialog(page)
    await waitForText(page, name, { absent: true })
  })
})
