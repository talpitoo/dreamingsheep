import { expect, test } from "@playwright/test"
import { prepare, shot } from "./helpers"

test.beforeEach(async ({ page }) => {
  await prepare(page)
})

test("search-filters-open", async ({ page }) => {
  await page.goto("/search")
  // ButtonGroup: [Filters (icon only below sm)] [Search]
  await page.locator(".MuiButtonGroup-root button").first().click()
  await expect(page.locator("form#search-dream .MuiCollapse-entered")).toBeVisible()
  await shot(page, "search-filters-open")
})

test("search-results", async ({ page }) => {
  await page.goto("/search?q=butterfly")
  await shot(page, "search-results")
})

test("symbols-card-edit", async ({ page }) => {
  await page.goto("/symbols")
  const card = page.locator(".MuiCard-root").first()
  await card.locator("button:has(span.lucidicon-pencil)").click()
  await expect(card.locator("form")).toBeVisible()
  await shot(page, "symbols-card-edit")
})

test("symbols-new-form", async ({ page }) => {
  await page.goto("/symbols")
  await page.getByRole("button", { name: "New symbol" }).click()
  await expect(page.locator('input[name="name"]').first()).toBeVisible()
  await shot(page, "symbols-new-form")
})
