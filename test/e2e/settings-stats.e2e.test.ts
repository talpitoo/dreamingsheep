import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { Browser, Page } from "puppeteer"
import { BASE, bodyText, launchBrowser, login, newPage, setCheckboxSetting, sleep } from "./helpers"

// cross-page: flipping a Settings switch changes what the Stats page renders.
// Whatever state the local DB is in, the original values are restored afterwards.
describe("settings drive the stats page", () => {
  let browser: Browser
  let page: Page
  let originalAdvanced: boolean | undefined
  let originalBedtime: boolean | undefined

  beforeAll(async () => {
    browser = await launchBrowser()
    page = await newPage(browser)
    await login(page)
  })
  afterAll(async () => {
    // restore both settings to what the DB had before the test
    if (originalAdvanced !== undefined) {
      await setCheckboxSetting(page, "advanced-charting", originalAdvanced)
    }
    if (originalBedtime !== undefined) {
      await setCheckboxSetting(page, "bedtime", originalBedtime)
    }
    await browser?.close()
  })

  async function statsState() {
    await page.goto(`${BASE}/stats`, { waitUntil: "networkidle2" })
    await sleep(4000)
    const text = await bodyText(page)
    return {
      advancedVisible: text.includes("matching dream"),
      // the range selector is the first toggle group in the DOM
      rangeButtons: await page.evaluate(
        () =>
          document.querySelector(".MuiToggleButtonGroup-root")?.querySelectorAll("button").length
      ),
    }
  }

  it("shows all 5 range buttons (day/week/month/from–to/all)", async () => {
    originalAdvanced = await setCheckboxSetting(page, "advanced-charting")
    originalBedtime = await setCheckboxSetting(page, "bedtime")
    expect((await statsState()).rangeButtons).toBe(5)
  })

  it("advanced charting OFF -> static charts, no filter form", async () => {
    await setCheckboxSetting(page, "advanced-charting", false)
    const state = await statsState()
    expect(state.advancedVisible).toBe(false)
    expect(await bodyText(page)).toContain("dream") // static "dream" chart card
  })

  it("advanced charting ON -> the filtered dashboard replaces the static grid", async () => {
    await setCheckboxSetting(page, "advanced-charting", true)
    const state = await statsState()
    expect(state.advancedVisible).toBe(true)
    expect(await page.$("#advanced-stats")).toBeTruthy()
  })

  it("bedtime tracking ON -> the sleep chart appears on top", async () => {
    await setCheckboxSetting(page, "bedtime", true)
    await page.goto(`${BASE}/stats`, { waitUntil: "networkidle2" })
    await sleep(4000)
    const firstCardTitle = await page.evaluate(() =>
      document.querySelector(".MuiCard-root .MuiTypography-subtitle1")?.textContent?.trim()
    )
    expect(firstCardTitle).toBe("sleep")
  })

  it("bedtime tracking OFF -> no sleep chart", async () => {
    await setCheckboxSetting(page, "bedtime", false)
    await page.goto(`${BASE}/stats`, { waitUntil: "networkidle2" })
    await sleep(4000)
    const titles = await page.evaluate(() =>
      [...document.querySelectorAll(".MuiCard-root .MuiTypography-subtitle1")].map((title) =>
        title.textContent?.trim()
      )
    )
    expect(titles).not.toContain("sleep")
  })
})
