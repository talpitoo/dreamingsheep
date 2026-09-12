import { expect, test } from "@playwright/test"
import { daysFromSeed, gotoDreamsDay, prepare, settle } from "./helpers"

/**
 * The cascade-layer contract that replaced `important: "#__next"` (issue #1). If this breaks,
 * every Tailwind class silently loses to MUI (or MUI loses to Preflight) and the pixels only tell
 * you afterwards.
 */

const EXPECTED_ORDER = "properties, theme, base, mui, components, utilities"

// a page with cards, buttons and an MUI-heavy form; the clock is frozen on the day it shows
const DAY = () => daysFromSeed(-1)
async function openJournal(page: import("@playwright/test").Page) {
  await prepare(page, { now: DAY() })
  await gotoDreamsDay(page, DAY())
  await settle(page)
}

test("the first layer statement declares the full order", async ({ page }) => {
  await openJournal(page)
  const statements = await page.evaluate(() => {
    const found: string[] = []
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules)) {
          if (rule.constructor.name === "CSSLayerStatementRule") {
            found.push(Array.from((rule as unknown as { nameList: string[] }).nameList).join(", "))
          }
        }
      } catch {
        /* cross-origin sheet */
      }
    }
    return found
  })
  expect(statements[0]).toBe(EXPECTED_ORDER)
})

test("every emotion rule lives in @layer mui", async ({ page }) => {
  await openJournal(page)
  const kinds = await page.evaluate(() =>
    // emotion inserts through the CSSOM in production ("speedy"), so read the sheets rather than
    // the elements' text
    Array.from(document.querySelectorAll<HTMLStyleElement>("style[data-emotion]")).flatMap(
      (element) =>
        Array.from(element.sheet?.cssRules ?? []).map(
          (rule) => `${rule.constructor.name}:${(rule as unknown as { name?: string }).name ?? ""}`
        )
    )
  )
  expect(kinds.length).toBeGreaterThan(0)
  expect([...new Set(kinds)]).toEqual(["CSSLayerBlockRule:mui"])
})

test("a utility beats MUI's own component style, without !important", async ({ page }) => {
  await openJournal(page)
  // CardActions ships 8px of padding; the call site asks for p-4 (16px) with a plain class
  const padding = await page
    .locator(".MuiCardActions-root.p-4")
    .first()
    .evaluate((element) => getComputedStyle(element).paddingTop)
  expect(padding).toBe("16px")
})

test("MUI still beats our base layer: buttons keep their own look", async ({ page }) => {
  await openJournal(page)
  // `button { padding: 0 }` sits in @layer base; MuiButton's emotion padding must win
  const padding = await page
    .getByRole("button", { name: "New dream" })
    .evaluate((element) => getComputedStyle(element).paddingLeft)
  expect(padding).not.toBe("0px")
})
