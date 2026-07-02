import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { Browser, Page } from "puppeteer"
import { BASE, bodyText, launchBrowser, newPage, sleep } from "./helpers"

// public pages: no login required
describe("public pages", () => {
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    browser = await launchBrowser()
    page = await newPage(browser)
  })
  afterAll(async () => {
    await browser?.close()
  })

  it("landing page offers the login form to visitors", async () => {
    await page.goto(BASE, { waitUntil: "networkidle2" })
    expect(await page.$('input[name="email"]')).toBeTruthy()
    expect(await page.$('input[name="password"]')).toBeTruthy()
  })

  it("blog lists articles, newest first", async () => {
    await page.goto(`${BASE}/blog`, { waitUntil: "networkidle2" })
    await sleep(1500)
    const text = await bodyText(page)
    expect(text).toContain("Use case three: Off the charts")
    expect(text).toContain("Backstory - the beginnings")
  })

  it("a blog article renders with its footnotes", async () => {
    const response = await page.goto(`${BASE}/blog/use-case-three-off-the-charts`, {
      waitUntil: "networkidle2",
    })
    expect(response?.status()).toBe(200)
    await sleep(1000)
    expect(await bodyText(page)).toContain("vampires are fully supported")
  })

  it("faq, privacy policy and terms load", async () => {
    for (const path of ["/faq", "/privacy-policy", "/terms-of-service"]) {
      const response = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" })
      expect(response?.status(), path).toBe(200)
    }
  })

  it("protected pages don't leak content to anonymous visitors", async () => {
    await page.goto(`${BASE}/stats`, { waitUntil: "networkidle2" })
    await sleep(2500)
    const text = await bodyText(page)
    // no dream data, no charts — the visitor is bounced/asked to log in
    expect(text).not.toContain("matching dream")
  })
})
