import { expect, test } from "@playwright/test"
import { openDialog, prepare, settingsPencil, shot } from "./helpers"

// The three cards whose edit mode differs structurally: a text-field card, the scaled symbols grid
// and a checkbox card. change-password and bedtime repeat those layouts. The read-only page is
// covered by every one of these shots (only one card is ever in edit mode).
const FORMS = ["user", "symbols", "advanced-charting"]

test.beforeEach(async ({ page }) => {
  await prepare(page)
})

// each card slides into edit mode (-mx-4, the symbols card additionally scales its toggle grid)
for (const formId of FORMS) {
  test(`settings-edit-${formId}`, async ({ page }) => {
    await page.goto("/settings")
    await settingsPencil(page, formId).click()
    await expect(page.locator(`button[type="submit"][form="${formId}"]`)).toBeVisible()
    await shot(page, `settings-edit-${formId}`)
  })
}

test("settings-export-dialog", async ({ page }) => {
  await page.goto("/settings")
  await openDialog(page, page.getByRole("button", { name: "dreamjournal.pdf" }))
  await shot(page, "settings-export-dialog")
})

test("settings-delete-account-dialog", async ({ page }) => {
  await page.goto("/settings")
  await settingsPencil(page, "user").click()
  await openDialog(page, page.getByRole("button", { name: /Delete account/ }))
  await shot(page, "settings-delete-account-dialog")
})
