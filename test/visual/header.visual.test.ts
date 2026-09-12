import { expect, test } from "@playwright/test"
import { gotoDreamsDay, prepare, seedDate, shot, width } from "./helpers"

test.beforeEach(async ({ page }) => {
  await prepare(page)
})

// the journal is only the backdrop here; the seed day itself has no dreams, which keeps the page
// short and the header the subject of the shot
const openJournal = (page: import("@playwright/test").Page) => gotoDreamsDay(page, seedDate())

test("header-mobile-menu-open", async ({ page }) => {
  test.skip(width(page) >= 900, "the mobile menu only exists below md")
  await openJournal(page)
  await page.getByRole("button", { name: "Menu" }).click()
  await expect(page.locator("header .MuiCollapse-entered")).toBeVisible()
  await shot(page, "header-mobile-menu-open")
})

test("header-account-menu-open", async ({ page }) => {
  test.skip(width(page) < 900, "the account dropdown only exists from md")
  await openJournal(page)
  await page.locator('[aria-label="Account of current user"]').click()
  await expect(page.locator("#menu-appbar .MuiMenu-paper")).toBeVisible()
  await shot(page, "header-account-menu-open")
})
