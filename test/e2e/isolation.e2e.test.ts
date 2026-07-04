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

const DALECOOPER = { email: "dalecooper@dreamingsheep.net", password: "Password_123" }

// the FAQ promises: dreams and user-created symbols are visible to their owner
// alone; built-in symbols are shared. Two seeded users prove it end to end.
describe("cross-user isolation (dreams + symbols)", () => {
  let browser: Browser
  let zhuangzi: Page
  let dalecooper: Page
  const symbolName = `e2e-private-${Date.now()}`

  beforeAll(async () => {
    browser = await launchBrowser()
    zhuangzi = await newPage(browser)
    await login(zhuangzi)
    // separate cookie jar for the second user
    const context = await browser.createIncognitoBrowserContext()
    dalecooper = await context.newPage()
    await dalecooper.setViewport({ width: 1280, height: 900 })
    await login(dalecooper, DALECOOPER)
  })
  afterAll(async () => {
    try {
      await zhuangzi.goto(`${BASE}/symbols`, { waitUntil: "networkidle2" })
      await sleep(2000)
      await gotoLastPaginationPage(zhuangzi)
      if ((await bodyText(zhuangzi)).includes(symbolName)) {
        await clickTrashInCard(zhuangzi, symbolName)
        await confirmDeletionDialog(zhuangzi)
        await sleep(2000)
      }
    } catch (error) {
      // best effort only
    }
    await browser?.close()
  })

  it("zhuangzi creates a private symbol", async () => {
    await zhuangzi.goto(`${BASE}/symbols`, { waitUntil: "networkidle2" })
    await sleep(2000)
    await clickButtonWithText(zhuangzi, "New symbol")
    await zhuangzi.waitForSelector('#create-symbol input[name="name"]', { timeout: 15_000 })
    await zhuangzi.type('#create-symbol input[name="name"]', symbolName)
    await submitForm(zhuangzi, "create-symbol")
    await waitForText(zhuangzi, symbolName)
  })

  it("dalecooper cannot see zhuangzi's symbol on his symbols page", async () => {
    await dalecooper.goto(`${BASE}/symbols`, { waitUntil: "networkidle2" })
    await sleep(2500)
    await gotoLastPaginationPage(dalecooper)
    expect(await bodyText(dalecooper)).not.toContain(symbolName)
  })

  it("dalecooper's search autocomplete doesn't offer it either", async () => {
    await dalecooper.goto(`${BASE}/search`, { waitUntil: "networkidle2" })
    await sleep(2000)
    await clickButtonWithText(dalecooper, "Filters")
    await dalecooper.waitForSelector('input[placeholder="type to search symbols..."]', {
      timeout: 15_000,
    })
    await dalecooper.type('input[placeholder="type to search symbols..."]', symbolName)
    await sleep(1500)
    const options = await dalecooper.evaluate(() =>
      [...document.querySelectorAll('li[role="option"]')].map((option) =>
        option.textContent?.trim()
      )
    )
    expect(options).not.toContain(symbolName)
  })

  it("dalecooper cannot find zhuangzi's dreams via search", async () => {
    await dalecooper.goto(`${BASE}/search?q=butterfly`, { waitUntil: "networkidle2" })
    await sleep(2500)
    const text = await bodyText(dalecooper)
    expect(text).toContain("0 results")
    expect(text).not.toContain("The Butterfly Dream")
  })

  it("built-in symbols stay shared: both users see them in Settings", async () => {
    for (const page of [zhuangzi, dalecooper]) {
      await page.goto(`${BASE}/settings`, { waitUntil: "networkidle2" })
      await sleep(2500)
      const text = await bodyText(page)
      expect(text).toContain("Predefined symbols")
      expect(text).toContain("unicorn")
    }
  })
})
