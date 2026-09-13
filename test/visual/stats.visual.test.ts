import { expect, Page, test } from "@playwright/test"
import { prepare, shot } from "./helpers"

// Both opt-ins are on for the whole suite (global-setup.ts), so the stats page renders the advanced
// dashboard plus the sleep chart. The clock is frozen on the seed day and the range is forced to
// "all", so the same dreams feed the charts every run.
async function openStats(page: Page) {
  await prepare(page)
  await page.addInitScript(() => window.sessionStorage.setItem("dreamingsheep.stats.range", "all"))
  await page.goto("/stats")
  await expect(page.locator(".chart-card svg").first()).toBeVisible({ timeout: 60_000 })
}

// the six-chart grid plus the from–to pickers of the "custom" range
test("stats-custom-range", async ({ page }) => {
  await openStats(page)
  await page.locator('.MuiToggleButtonGroup-root button[value="custom"]').click()
  await expect(page.locator(".MuiCollapse-entered").first()).toBeVisible()
  await shot(page, "stats-custom-range")
})

// the filter toggle is labelled "Filters" from sm up and shrinks to a bare Settings icon below it,
// so address it by what never changes
test("stats-filters-panel-open", async ({ page }) => {
  await openStats(page)
  await page.locator('button[aria-controls="advanced-stats-panel"]').click()
  await expect(page.locator("#advanced-stats-panel.MuiCollapse-entered")).toBeVisible()
  await shot(page, "stats-filters-panel-open")
})
