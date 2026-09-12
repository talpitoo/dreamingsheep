import { expect, Page, test } from "@playwright/test"
import { daysFromSeed, gotoDreamsDay, openDialog, prepare, seedDate, shot } from "./helpers"

const firstCard = (page: Page) => page.locator(".MuiCard-root").first()
// the day before the seed day carries four seeded dreams (db/utils/seedDefaultDreams.ts); the seed
// day itself has none. The clock is frozen on the day under test — see gotoDreamsDay().
const DREAM_DAY = () => daysFromSeed(-1)

async function openDreams(page: Page, day: string) {
  await prepare(page, { now: day })
  await gotoDreamsDay(page, day)
}

test("dreams-today-empty", async ({ page }) => {
  await openDreams(page, seedDate())
  await shot(page, "dreams-today-empty")
})

// The card toggles into edit mode with the -mx-4 margin animation, then "More" reveals the
// time/mood/recall/type toggle grid and the symbols picker. Inside an edit card the container is
// 2rem narrower than the create form's, so the toggle rows wrap differently — this one shot covers
// the list, the edit card and the expanded panel together.
test("dreams-card-edit-more", async ({ page }) => {
  await openDreams(page, DREAM_DAY())
  await firstCard(page).locator("button:has(span.lucidicon-pencil)").click()
  await expect(firstCard(page).locator("form")).toBeVisible()
  await firstCard(page).getByRole("button", { name: "More" }).click()
  await expect(firstCard(page).locator("#tags-filled")).toBeVisible()
  await shot(page, "dreams-card-edit-more")
})

test("dreams-delete-dialog", async ({ page }) => {
  await openDreams(page, DREAM_DAY())
  await openDialog(page, firstCard(page).locator("button:has(span.lucidicon-trash)"))
  await shot(page, "dreams-delete-dialog")
})

test("dreams-symbols-autocomplete", async ({ page }) => {
  await openDreams(page, DREAM_DAY())
  await page.getByRole("button", { name: "New dream" }).click()
  await page.getByRole("button", { name: "More" }).click()
  // the symbols autocomplete popup is portaled to <body>
  await page.locator("#tags-filled").click()
  await page.keyboard.type("s")
  await expect(page.locator('[role="listbox"]')).toBeVisible()
  await shot(page, "dreams-symbols-autocomplete-open")
  // a name matching no symbol offers `Add "…"`, which opens the instant-symbol dialog (portaled)
  await page.locator("#tags-filled").fill("visualregression")
  await openDialog(page, page.locator('[role="option"]', { hasText: 'Add "visualregression"' }))
  await shot(page, "dreams-instant-symbol-dialog")
})
