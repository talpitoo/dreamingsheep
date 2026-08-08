import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { Browser, Page } from "puppeteer"
import { BASE, bodyText, launchBrowser, login, newPage, sleep } from "./helpers"

// relies on the seeded demo data (npm run db:seed): zhuangzi's "The Butterfly Dream"
describe("search", () => {
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    browser = await launchBrowser()
    page = await newPage(browser)
    await login(page)
  })
  afterAll(async () => {
    await browser?.close()
  })

  async function resultCount(query: string): Promise<number> {
    await page.goto(`${BASE}/search${query}`, { waitUntil: "networkidle2" })
    await sleep(2500)
    const match = (await bodyText(page)).match(/(\d+) results/)
    if (!match) throw new Error(`No result count found for ${query}`)
    return Number(match[1])
  }

  it("finds the seeded butterfly dream by keyword", async () => {
    expect(await resultCount("?q=butterfly")).toBe(1)
    expect(await bodyText(page)).toContain("The Butterfly Dream")
  })

  it("keyword matching is case-insensitive", async () => {
    expect(await resultCount("?q=BUTTERFLY")).toBe(1)
  })

  it("returns zero results (not an error) for garbage queries", async () => {
    expect(await resultCount(`?q=${encodeURIComponent("%%%🦄'--;")}`)).toBe(0)
    expect(await bodyText(page)).toContain("No dreams matching your query.")
  })

  it("filters by dream type via URL params", async () => {
    const lucidCount = await resultCount("?type=LUCID")
    const allCount = await resultCount("")
    expect(lucidCount).toBeGreaterThan(0)
    expect(lucidCount).toBeLessThan(allCount)
  })

  it("combines keyword and type filters with AND semantics", async () => {
    expect(await resultCount("?q=butterfly&type=MEDITATION")).toBe(0)
  })
})
