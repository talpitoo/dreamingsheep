import { Page, test } from "@playwright/test"
import { prepare, shot } from "./helpers"

// anonymous visitor: no stored session
test.use({ storageState: { cookies: [], origins: [] } })

// The landing page is covered by home-cookie-notice and the signup page by
// signup-password-focused — the same layouts with one extra element, so a bare shot of each would
// only repeat them.
const PAGES: [string, string][] = [
  ["forgot-password", "/forgot-password"],
  ["reset-password", "/reset-password?token=visual-regression"],
  ["blog", "/blog"],
  // every article shares one layout (SheepGridContainer + Container + Typography), so the index
  // plus a single article covers the blog
  ["blog-article", "/blog/use-case-three-off-the-charts"],
  ["faq", "/faq"],
  ["privacy-policy", "/privacy-policy"],
  ["terms-of-service", "/terms-of-service"],
  ["not-found", "/this-page-does-not-exist"],
  ["login-fallback", "/stats"], // a private page as a visitor → the "session expired" login fallback
]

// the home-page counters (getServerSideProps, last-31-days window) drift as the seed ages
const homeMask = (page: Page) => ({ mask: [page.locator("strong")] })

for (const [name, url] of PAGES) {
  test(name, async ({ page }) => {
    await prepare(page)
    await page.goto(url)
    await shot(page, name)
  })
}

test("home-cookie-notice", async ({ page }) => {
  await prepare(page, { cookieNotice: true })
  await page.goto("/")
  await shot(page, "home-cookie-notice", homeMask(page))
})

// One focused-field shot for the whole suite. Signup carries the glued password pair (no radius on
// the joint, -1px overlap), which is the only interesting case — every other form reuses the same
// LabeledTextField. contracts.visual.test.ts asserts the glued geometry at every width anyway.
test("signup-password-focused", async ({ page }) => {
  await prepare(page)
  await page.goto("/signup")
  await page.locator('input[name="password"]').focus()
  await shot(page, "signup-password-focused")
})
