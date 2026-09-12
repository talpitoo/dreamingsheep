import { expect, Page, test } from "@playwright/test"
import { gotoDreamsDay, prepare, seedDate, settle, width } from "./helpers"

/**
 * The things pixels can miss: which rules actually apply at each breakpoint edge, and the
 * transitions behind the card/button/toggle animations. Every expectation below describes the
 * CURRENT rendering — if one fails, measure the real value and decide whether the change was
 * intended before touching it.
 */

const css = (page: Page, selector: string, property: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((element, prop) => getComputedStyle(element).getPropertyValue(prop), property)

test.beforeEach(async ({ page }) => {
  await prepare(page)
})

test("body background switches at the sm edge (600px)", async ({ page }) => {
  await page.goto("/blog")
  await settle(page)
  // two layers (the progressive photo over its blurred placeholder), so every background
  // shorthand computes to a pair of values
  const image = await css(page, "body", "background-image")
  expect(await css(page, "body", "background-color")).toBe("rgb(0, 151, 167)")
  if (width(page) >= 600) {
    expect(image).toContain("background-canvas-progressive.jpg")
    expect(await css(page, "body", "background-attachment")).toBe("fixed, fixed")
    expect(await css(page, "body", "background-size")).toBe("cover, cover")
    expect(await css(page, "body", "background-repeat")).toBe("no-repeat, no-repeat")
  } else {
    expect(image).toContain("background-canvas-mobile-progressive-double-height.jpg")
    expect(await css(page, "body", "background-size")).toBe("600px 1920px, 600px 1920px")
    expect(await css(page, "body", "background-attachment")).toBe("scroll, scroll")
  }
})

test("MUI Container is fluid, then fixed at lg (1200px)", async ({ page }) => {
  await page.goto("/blog")
  await settle(page)
  const box = (await page.locator(".MuiContainer-root").first().boundingBox())!
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
  expect(Math.round(box.width)).toBe(Math.min(1200, clientWidth))
  expect(await css(page, ".MuiContainer-root", "padding-left")).toBe(
    width(page) >= 600 ? "24px" : "16px"
  )
})

test("xsmax (≤ 320px, INCLUSIVE) rules", async ({ page }) => {
  await gotoDreamsDay(page, seedDate())
  await settle(page)
  // the calendar bleeds edge-to-edge on the smallest phones
  expect(await css(page, ".xsmax\\:-mx-8", "margin-left")).toBe(
    width(page) <= 320 ? "-32px" : "0px"
  )
  if (width(page) < 900) {
    await page.getByRole("button", { name: "Menu" }).click()
    await settle(page)
    const title = (await page.locator('img[alt="logo-title"]').boundingBox())!
    expect(Math.round(title.width)).toBe(width(page) <= 320 ? 160 : 216)
  }
})

test("header collapses below md (900px)", async ({ page }) => {
  await gotoDreamsDay(page, seedDate())
  await settle(page)
  const collapse = page.locator("header .MuiCollapse-root")
  const menu = page.getByRole("button", { name: "Menu" })
  if (width(page) >= 900) {
    await expect(collapse).toHaveClass(/MuiCollapse-entered/)
    await expect(menu).toBeHidden()
  } else {
    await expect(collapse).not.toHaveClass(/MuiCollapse-entered/)
    await expect(menu).toBeVisible()
  }
})

test("card, button and toggle-grid animations keep their transitions", async ({ page }) => {
  await page.goto("/settings")
  await settle(page)
  // transition-property comes from the custom utility, the duration from MUI's Paper rule
  expect(await css(page, "form#user .MuiCard-root", "transition-property")).toBe("margin")
  expect(await css(page, "form#user .MuiCard-root", "transition-duration")).toBe("0.3s")
  await page.locator("form#user button.MuiIconButton-root").click()
  await settle(page)
  const update = 'button[type="submit"][form="user"]'
  expect(await css(page, update, "transition-property")).toBe("all")
  expect(await css(page, update, "transition-duration")).toBe("0.3s")
  expect(await css(page, update, "transition-timing-function")).toBe("cubic-bezier(0.4, 0, 0.2, 1)")
  const grid = "form#symbols .transition-transform"
  expect(await css(page, grid, "transition-property")).toBe("transform")
  expect(await css(page, grid, "transition-duration")).toBe("0.15s")
})

test("toggle-button overrides (index.css today, Theme.ts after M2)", async ({ page }) => {
  await page.goto("/settings")
  await settle(page)
  expect(await css(page, ".MuiToggleButtonGroup-root", "border-left")).toBe(
    "1px solid rgb(224, 224, 224)"
  )
  expect(await css(page, ".MuiToggleButtonGroup-root", "padding-top")).toBe("1px")
  const grouped = ".MuiToggleButtonGroup-grouped"
  expect(await css(page, grouped, "min-width")).toBe("86px")
  expect(await css(page, grouped, "min-height")).toBe("76px")
  expect(await css(page, grouped, "text-transform")).toBe("lowercase")
  expect(await css(page, grouped, "font-size")).toBe("14px")
  expect(await css(page, grouped, "margin-top")).toBe("-1px")
})

test("stats range toggles keep their padding switch and their stuck min-width", async ({
  page,
}) => {
  await page.addInitScript(() => window.sessionStorage.setItem("dreamingsheep.stats.range", "all"))
  await page.goto("/stats")
  await settle(page)
  const all = '.MuiToggleButtonGroup-root button[value="all"]'
  // the horizontal padding does switch at sm …
  expect(await css(page, all, "padding-left")).toBe(width(page) >= 600 ? "11px" : "7px")
  // … but the min-width never does: sx={{ minWidth: { xs: "48px !important", sm: "86px" } }} marks
  // the xs value !important, which outranks the sm media rule at EVERY width. The buttons are
  // therefore 48px wide on desktop too — surprising, pre-existing, and to be preserved as-is:
  // `min-w-[48px]! sm:min-w-[86px]` reproduces it exactly (an important declaration beats a plain
  // one whatever the media query). Fixing it is a separate, deliberate decision.
  expect(await css(page, all, "min-width")).toBe("48px")
})

test("no hover utility is gated behind @media (hover: hover)", async ({ page }) => {
  await page.goto("/blog")
  await settle(page)
  const gated = await page.evaluate(() => {
    let count = 0
    const walk = (rules: CSSRuleList) => {
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSMediaRule && /\(hover:\s*hover\)/.test(rule.conditionText)) count++
        if ("cssRules" in rule) walk((rule as CSSGroupingRule).cssRules)
      }
    }
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        walk(sheet.cssRules)
      } catch {
        /* cross-origin sheet */
      }
    }
    return count
  })
  expect(gated).toBe(0)
})

test.describe("visitor", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("login fields are glued: 1px overlap, no radius on the joint, focused outline on top", async ({
    page,
  }) => {
    await page.goto("/")
    await settle(page)
    const email = page.locator(".MuiOutlinedInput-root", {
      has: page.locator('input[name="email"]'),
    })
    const password = page.locator(".MuiOutlinedInput-root", {
      has: page.locator('input[name="password"]'),
    })
    const emailBox = (await email.boundingBox())!
    const passwordBox = (await password.boundingBox())!
    expect(Math.round(passwordBox.y)).toBe(Math.round(emailBox.y + emailBox.height - 1))
    expect(await email.evaluate((el) => getComputedStyle(el).borderBottomLeftRadius)).toBe("0px")
    expect(await password.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe("0px")
    await page.locator('input[name="password"]').focus()
    const outline = password.locator(".MuiOutlinedInput-notchedOutline")
    expect(await outline.evaluate((el) => getComputedStyle(el).borderColor)).toBe(
      "rgb(0, 188, 212)"
    )
    expect(await outline.evaluate((el) => getComputedStyle(el).borderWidth)).toBe("2px")
  })
})
